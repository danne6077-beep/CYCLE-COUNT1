package ph.fuji.grocery.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "products", indices = [Index("category"), Index("name")])
data class Product(@PrimaryKey val sku: String, val name: String, val category: String,
    val department: String, val price: Long, val masterMatched: Boolean)

@Entity(tableName = "barcodes", primaryKeys = ["code", "sku"], indices = [Index("sku")])
data class Barcode(val code: String, val sku: String)

@Entity(tableName = "basket")
data class BasketLine(@PrimaryKey val sku: String, val name: String, val category: String,
    val price: Long, val quantity: Int = 1, val shelfPrice: Boolean = false)

@Entity(tableName = "boards")
data class Board(@PrimaryKey val id: String, val name: String)

@Entity(tableName = "list_items", primaryKeys = ["boardId", "sku"])
data class ListItem(val boardId: String, val sku: String, val name: String, val checked: Boolean = false)

@Entity(tableName = "trips")
data class Trip(@PrimaryKey val id: String, val date: String, val total: Long,
    val budget: Long, val count: Int, val linesJson: String)

@Entity(tableName = "photos")
data class ProductPhoto(@PrimaryKey val sku: String, val path: String)

@Entity(tableName = "metadata")
data class Metadata(@PrimaryKey val key: String, val value: String)

@Dao
interface FujiDao {
    @Query("SELECT * FROM products WHERE (:category = '' OR category = :category) AND (:favoritesOnly = 0 OR sku IN (:favorites)) AND (name LIKE '%' || :query || '%' OR sku = :query OR category LIKE '%' || :query || '%') ORDER BY name COLLATE NOCASE LIMIT :limit")
    fun search(query: String, category: String, favoritesOnly: Boolean, favorites: List<String>, limit: Int): Flow<List<Product>>
    @Query("SELECT DISTINCT category FROM products ORDER BY category") fun categories(): Flow<List<String>>
    @Query("SELECT * FROM products WHERE sku = :sku") suspend fun product(sku: String): Product?
    @Query("SELECT DISTINCT products.* FROM products LEFT JOIN barcodes ON products.sku = barcodes.sku WHERE products.sku = :code OR barcodes.code IN (:variants) ORDER BY products.name")
    suspend fun lookup(code: String, variants: List<String>): List<Product>
    @Query("SELECT COUNT(*) FROM products") fun count(): Flow<Int>
    @Upsert suspend fun products(items: List<Product>)
    @Insert(onConflict = OnConflictStrategy.IGNORE) suspend fun barcodes(items: List<Barcode>)
    @Query("DELETE FROM products") suspend fun clearProducts()
    @Query("DELETE FROM barcodes") suspend fun clearBarcodes()
    @Query("SELECT value FROM metadata WHERE `key` = :key") suspend fun metadata(key: String): String?
    @Upsert suspend fun metadata(value: Metadata)
    @Query("SELECT * FROM basket ORDER BY rowid") fun basket(): Flow<List<BasketLine>>
    @Query("SELECT * FROM basket WHERE sku = :sku") suspend fun basketLine(sku: String): BasketLine?
    @Upsert suspend fun basket(line: BasketLine)
    @Query("DELETE FROM basket WHERE sku = :sku") suspend fun removeBasket(sku: String)
    @Query("DELETE FROM basket") suspend fun clearBasket()
    @Query("SELECT * FROM boards ORDER BY name") fun boards(): Flow<List<Board>>
    @Upsert suspend fun board(board: Board)
    @Query("DELETE FROM boards WHERE id = :id") suspend fun deleteBoard(id: String)
    @Query("DELETE FROM list_items WHERE boardId = :id") suspend fun deleteBoardItems(id: String)
    @Query("SELECT * FROM list_items ORDER BY name") fun listItems(): Flow<List<ListItem>>
    @Upsert suspend fun listItem(item: ListItem)
    @Query("DELETE FROM list_items WHERE boardId = :board AND sku = :sku") suspend fun removeListItem(board: String, sku: String)
    @Query("SELECT * FROM trips ORDER BY date DESC") fun trips(): Flow<List<Trip>>
    @Insert suspend fun trip(trip: Trip)
    @Query("SELECT * FROM photos WHERE sku = :sku") fun photo(sku: String): Flow<ProductPhoto?>
    @Upsert suspend fun photo(photo: ProductPhoto)
    @Query("SELECT * FROM photos") suspend fun photos(): List<ProductPhoto>
    @Query("DELETE FROM photos") suspend fun clearPhotos()
    @Query("DELETE FROM trips") suspend fun clearTrips()
    @Query("DELETE FROM list_items") suspend fun clearListItems()
    @Query("DELETE FROM boards") suspend fun clearBoards()
}

@Database(entities = [Product::class, Barcode::class, BasketLine::class, Board::class,
    ListItem::class, Trip::class, ProductPhoto::class, Metadata::class], version = 1, exportSchema = true)
abstract class FujiDatabase : RoomDatabase() { abstract fun dao(): FujiDao }
