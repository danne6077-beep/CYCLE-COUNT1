package ph.fuji.grocery.ui

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import ph.fuji.grocery.R
import ph.fuji.grocery.data.*
import ph.fuji.grocery.domain.Money
import javax.inject.Inject

data class SearchFilter(val query: String = "", val category: String = "", val favorites: Boolean = false, val limit: Int = 40)

@OptIn(ExperimentalCoroutinesApi::class, FlowPreview::class)
@HiltViewModel
class ShopperViewModel @Inject constructor(val repository: ShopRepository, val settings: PreferenceStore) : ViewModel() {
    val preferences = settings.flow.map<Preferences, Preferences?> { it }.stateIn(viewModelScope, SharingStarted.Eagerly, null)
    val filter = MutableStateFlow(SearchFilter())
    val products = combine(filter.debounce(180), settings.flow) { f, p -> f to p.favorites }
        .flatMapLatest { (f, favorites) -> repository.search(alias(f.query), f.category, f.favorites, favorites, f.limit) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val basket = repository.basket.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val categories = repository.categories.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val boards = repository.boards.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val listItems = repository.listItems.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val trips = repository.trips.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
    val count = repository.count.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)
    val matches = MutableStateFlow<List<Product>?>(null)
    val busy = MutableStateFlow(false)
    private val mutableMessages = MutableSharedFlow<Int>(extraBufferCapacity = 8)
    val messages = mutableMessages.asSharedFlow()
    init { retry() }
    private fun alias(query: String): String = mapOf("bigas" to "rice", "gatas" to "milk", "kape" to "coffee", "asukal" to "sugar", "mantika" to "oil")[query.trim().lowercase()] ?: query.trim()
    fun action(block: suspend () -> Unit) { viewModelScope.launch {
        try { block() } catch (cancel: CancellationException) { throw cancel }
        catch (_: Exception) { mutableMessages.emit(R.string.action_error) }
    } }
    fun retry() { action { repository.seed() } }
    fun query(value: String) { filter.value = filter.value.copy(query = value.take(100), limit = 40) }
    fun category(value: String) { filter.value = filter.value.copy(category = value, limit = 40) }
    fun favorites(value: Boolean) { filter.value = filter.value.copy(favorites = value, limit = 40) }
    fun loadMore() { filter.value = filter.value.copy(limit = (filter.value.limit + 40).coerceAtMost(15000)) }
    fun add(product: Product) { action { repository.add(product); mutableMessages.emit(R.string.added) } }
    fun lookup(code: String) { action { matches.value = repository.lookup(code) } }
    fun rememberSearch() { action { settings.recent(filter.value.query) } }
    fun setBudget(raw: String): Boolean {
        val value = if (raw.isBlank()) 0 else Money.parse(raw) ?: return false
        action { settings.budget(value) }; return true
    }
    fun finish() { if (busy.value) return; busy.value = true; viewModelScope.launch {
        try { repository.finish(preferences.value?.budget ?: 0); mutableMessages.emit(R.string.trip_saved) }
        catch (cancel: CancellationException) { throw cancel }
        catch (_: Exception) { mutableMessages.emit(R.string.action_error) }
        finally { busy.value = false }
    } }
    fun importPhoto(sku: String, uri: Uri) { action { repository.importPhoto(sku, uri); mutableMessages.emit(R.string.photo_saved) } }
    fun deletePrivateData() { action { repository.deletePrivateData(); settings.reset(); mutableMessages.emit(R.string.deleted) } }
}
