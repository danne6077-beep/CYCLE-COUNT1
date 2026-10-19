package ph.fuji.grocery.data

import android.content.Context
import android.net.Uri
import android.util.JsonReader
import androidx.room.withTransaction
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import ph.fuji.grocery.domain.Money
import ph.fuji.grocery.domain.Barcodes
import java.io.File
import java.time.Instant
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

data class CatalogState(val loading: Boolean = true, val error: Boolean = false)
interface ShopRepository {
    val state: StateFlow<CatalogState>
    val basket: Flow<List<BasketLine>>
    val boards: Flow<List<Board>>
    val listItems: Flow<List<ListItem>>
    val trips: Flow<List<Trip>>
    val categories: Flow<List<String>>
    val count: Flow<Int>
    suspend fun seed()
    fun search(query: String, category: String, favoriteOnly: Boolean, favorites: Set<String>, limit: Int): Flow<List<Product>>
    suspend fun product(sku: String): Product?
    suspend fun lookup(code: String): List<Product>
    suspend fun add(product: Product)
    suspend fun quantity(line: BasketLine, delta: Int)
    suspend fun shelfPrice(line: BasketLine, value: Long)
    suspend fun finish(budget: Long)
    suspend fun board(name: String)
    suspend fun deleteBoard(id: String)
    suspend fun listItem(item: ListItem)
    suspend fun removeListItem(item: ListItem)
    fun photo(sku: String): Flow<ProductPhoto?>
    suspend fun importPhoto(sku: String, uri: Uri)
    suspend fun clearPhotos()
    suspend fun deletePrivateData()
}

@Singleton
class LocalRepository @Inject constructor(private val database: FujiDatabase,
    @param:ApplicationContext private val context: Context) : ShopRepository {
    private val dao = database.dao()
    private val mutableState = MutableStateFlow(CatalogState())
    override val state: StateFlow<CatalogState> = mutableState
    override val basket = dao.basket()
    override val boards = dao.boards()
    override val listItems = dao.listItems()
    override val trips = dao.trips()
    override val categories = dao.categories()
    override val count = dao.count()
    override fun search(query: String, category: String, favoriteOnly: Boolean, favorites: Set<String>, limit: Int) =
        dao.search(query.replace('%', ' ').replace('_', ' ').trim(), category, favoriteOnly, favorites.toList().ifEmpty { listOf("") }, limit)
    override suspend fun product(sku: String) = dao.product(sku)
    override suspend fun lookup(code: String): List<Product> {
        val variants = Barcodes.variants(code)
        if (variants.isEmpty()) return emptyList()
        return dao.lookup(variants.first(), variants)
    }
    override suspend fun seed() = withContext(Dispatchers.IO) {
        mutableState.value = CatalogState()
        try {
            val checksum = context.assets.open("catalog-version.txt").bufferedReader().use { it.readText().trim() }
            if (dao.metadata("catalog") != checksum) database.withTransaction {
                dao.clearBarcodes(); dao.clearProducts()
                val products = mutableListOf<Product>(); val codes = mutableListOf<Barcode>()
                context.assets.open("seed_data.json").bufferedReader().use { input ->
                    JsonReader(input).use { json ->
                        json.beginArray()
                        while (json.hasNext()) {
                            var sku = ""; var name = ""; var category = ""; var department = ""
                            var price = 0L; var matched = false; val barcodes = mutableListOf<String>()
                            json.beginObject()
                            while (json.hasNext()) when (json.nextName()) {
                                "sku" -> sku = json.nextString()
                                "name" -> name = json.nextString()
                                "category" -> category = json.nextString()
                                "department" -> department = json.nextString()
                                "priceCentavos" -> price = json.nextLong()
                                "masterMatched" -> matched = json.nextBoolean()
                                "barcodes" -> { json.beginArray(); while (json.hasNext()) barcodes.add(json.nextString()); json.endArray() }
                                else -> json.skipValue()
                            }
                            json.endObject()
                            require(sku.isNotBlank() && name.isNotBlank() && price in 0..Money.MAX)
                            products.add(Product(sku, name, category, department, price, matched))
                            codes.addAll(barcodes.map { Barcode(it, sku) })
                            if (products.size >= 300) { dao.products(products); dao.barcodes(codes); products.clear(); codes.clear() }
                        }
                        json.endArray()
                    }
                }
                dao.products(products); dao.barcodes(codes); dao.metadata(Metadata("catalog", checksum))
            }
            if (dao.boards().first().isEmpty()) dao.board(Board("next", context.getString(ph.fuji.grocery.R.string.default_list)))
            mutableState.value = CatalogState(loading = false)
        } catch (cancel: kotlinx.coroutines.CancellationException) { throw cancel }
        catch (_: Exception) { mutableState.value = CatalogState(loading = false, error = true) }
    }
    override suspend fun add(product: Product) = database.withTransaction {
        val old = dao.basketLine(product.sku)
        require((old?.quantity ?: 0) < 9999)
        dao.basket(old?.copy(quantity = old.quantity + 1) ?: BasketLine(product.sku, product.name, product.category, product.price))
    }
    override suspend fun quantity(line: BasketLine, delta: Int) = database.withTransaction {
        val current = dao.basketLine(line.sku) ?: return@withTransaction
        val next = current.quantity + delta
        require(next <= 9999)
        if (next < 1) dao.removeBasket(line.sku) else dao.basket(current.copy(quantity = next))
    }
    override suspend fun shelfPrice(line: BasketLine, value: Long) = database.withTransaction {
        require(value in 0..Money.MAX)
        dao.basketLine(line.sku)?.let { dao.basket(it.copy(price = value, shelfPrice = true)) }
        Unit
    }
    override suspend fun finish(budget: Long) = database.withTransaction {
        val lines = dao.basket().first()
        require(lines.isNotEmpty())
        val snapshot = JSONArray()
        lines.forEach { snapshot.put(JSONObject().put("sku", it.sku).put("name", it.name)
            .put("priceCentavos", it.price).put("quantity", it.quantity).put("shelfPrice", it.shelfPrice)) }
        dao.trip(Trip(UUID.randomUUID().toString(), Instant.now().toString(), Money.total(lines.map { it.price to it.quantity }),
            budget, lines.sumOf { it.quantity }, snapshot.toString()))
        dao.clearBasket()
    }
    override suspend fun board(name: String) { require(name.trim().length in 1..60); dao.board(Board(UUID.randomUUID().toString(), name.trim())) }
    override suspend fun deleteBoard(id: String) = database.withTransaction { dao.deleteBoardItems(id); dao.deleteBoard(id) }
    override suspend fun listItem(item: ListItem) { dao.listItem(item) }
    override suspend fun removeListItem(item: ListItem) { dao.removeListItem(item.boardId, item.sku) }
    override fun photo(sku: String) = dao.photo(sku)
    override suspend fun importPhoto(sku: String, uri: Uri) = withContext(Dispatchers.IO) {
        require(dao.product(sku) != null)
        val directory = File(context.filesDir, "photos").apply { mkdirs() }
        val target = File(directory, "${UUID.randomUUID()}.img")
        try {
            context.contentResolver.openInputStream(uri).use { input ->
                requireNotNull(input)
                target.outputStream().use { output ->
                    val buffer = ByteArray(8192); var total = 0
                    while (true) { val size = input.read(buffer); if (size == -1) break; total += size; require(total <= 12 * 1024 * 1024); output.write(buffer, 0, size) }
                }
            }
            val options = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
            android.graphics.BitmapFactory.decodeFile(target.path, options)
            require(options.outWidth in 1..20000 && options.outHeight in 1..20000)
            val old = dao.photo(sku).first()
            dao.photo(ProductPhoto(sku, target.path))
            old?.let { File(it.path).takeIf { file -> file.parentFile?.canonicalPath == directory.canonicalPath }?.delete() }
            Unit
        } catch (e: Exception) { target.delete(); throw e }
    }
    override suspend fun clearPhotos() = withContext(Dispatchers.IO) {
        val directory = File(context.filesDir, "photos").canonicalFile
        dao.photos().forEach { photo -> File(photo.path).canonicalFile.takeIf { it.parentFile == directory }?.delete() }
        dao.clearPhotos()
        Unit
    }
    override suspend fun deletePrivateData() {
        clearPhotos()
        database.withTransaction { dao.clearBasket(); dao.clearTrips(); dao.clearListItems(); dao.clearBoards() }
        dao.board(Board("next", context.getString(ph.fuji.grocery.R.string.default_list)))
    }
}
