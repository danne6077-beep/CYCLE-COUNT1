package ph.fuji.grocery

import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import ph.fuji.grocery.data.*
import ph.fuji.grocery.ui.ShopperViewModel

@OptIn(ExperimentalCoroutinesApi::class)
class ShopperViewModelTest {
    private val dispatcher = StandardTestDispatcher()
    @Before fun setup() { Dispatchers.setMain(dispatcher) }
    @After fun teardown() { Dispatchers.resetMain() }
    @Test fun searchesUseCategoryFavoritesAndFilipinoAliases() = runTest(dispatcher) {
        val repo = FakeRepository(); val settings = FakeSettings(); val vm = ShopperViewModel(repo, settings)
        backgroundScope.launchIn(vm.products)
        vm.query("bigas"); vm.category("STAPLE"); vm.favorites(true)
        settings.data.value = Preferences(favorites = setOf("1"))
        advanceTimeBy(200); runCurrent()
        assertEquals("rice", repo.query)
        assertEquals("STAPLE", repo.category)
        assertTrue(repo.onlyFavorites)
        assertEquals(setOf("1"), repo.favorites)
    }
    @Test fun invalidBudgetAndDuplicateFinishAreBlocked() = runTest(dispatcher) {
        val repo = FakeRepository(); val settings = FakeSettings(); val vm = ShopperViewModel(repo, settings)
        runCurrent()
        assertFalse(vm.setBudget("1.999")); assertFalse(vm.setBudget("-1"))
        assertTrue(vm.setBudget("400.01")); runCurrent()
        assertEquals(40001L, settings.data.value.budget)
        vm.finish(); vm.finish(); runCurrent()
        assertEquals(1, repo.finished)
        assertEquals(40001L, repo.savedBudget)
    }
    @Test fun lookupAndAddingDelegateToOfflineRepository() = runTest(dispatcher) {
        val repo = FakeRepository(); val vm = ShopperViewModel(repo, FakeSettings())
        vm.lookup("000123"); runCurrent()
        assertEquals("000123", repo.lookupCode)
        assertEquals(repo.sample, vm.matches.value?.single())
        vm.add(repo.sample); runCurrent()
        assertEquals(1, repo.added)
    }
    private fun kotlinx.coroutines.CoroutineScope.launchIn(flow: Flow<*>) = flow.launchIn(this)
}

private class FakeSettings : PreferenceStore {
    val data = MutableStateFlow(Preferences())
    override val flow: Flow<Preferences> = data
    override suspend fun welcome() { data.value = data.value.copy(welcomed = true) }
    override suspend fun theme(value: String) { data.value = data.value.copy(theme = value) }
    override suspend fun dynamic(value: Boolean) { data.value = data.value.copy(dynamicColor = value) }
    override suspend fun budget(value: Long) { data.value = data.value.copy(budget = value) }
    override suspend fun favorite(sku: String) {}
    override suspend fun recent(query: String) {}
    override suspend fun clearRecent() {}
    override suspend fun reset() { data.value = Preferences(welcomed = true) }
}
private class FakeRepository : ShopRepository {
    val sample = Product("1", "RICE", "STAPLE", "FRESH & STAPLE", 5000, true)
    override val state = MutableStateFlow(CatalogState(false))
    override val basket = MutableStateFlow(emptyList<BasketLine>())
    override val boards = MutableStateFlow(emptyList<Board>())
    override val listItems = MutableStateFlow(emptyList<ListItem>())
    override val trips = MutableStateFlow(emptyList<Trip>())
    override val categories = MutableStateFlow(listOf("STAPLE"))
    override val count = MutableStateFlow(1)
    var query = ""; var category = ""; var onlyFavorites = false; var favorites = emptySet<String>()
    var finished = 0; var savedBudget = 0L; var lookupCode = ""; var added = 0
    override suspend fun seed() {}
    override fun search(query: String, category: String, favoriteOnly: Boolean, favorites: Set<String>, limit: Int): Flow<List<Product>> {
        this.query = query; this.category = category; this.onlyFavorites = favoriteOnly; this.favorites = favorites
        return flowOf(listOf(sample))
    }
    override suspend fun product(sku: String) = sample.takeIf { it.sku == sku }
    override suspend fun lookup(code: String): List<Product> { lookupCode = code; return listOf(sample) }
    override suspend fun add(product: Product) { added++ }
    override suspend fun quantity(line: BasketLine, delta: Int) {}
    override suspend fun shelfPrice(line: BasketLine, value: Long) {}
    override suspend fun finish(budget: Long) { finished++; savedBudget = budget }
    override suspend fun board(name: String) {}
    override suspend fun deleteBoard(id: String) {}
    override suspend fun listItem(item: ListItem) {}
    override suspend fun removeListItem(item: ListItem) {}
    override fun photo(sku: String): Flow<ProductPhoto?> = flowOf(null)
    override suspend fun importPhoto(sku: String, uri: Uri) {}
    override suspend fun clearPhotos() {}
    override suspend fun deletePrivateData() {}
}
