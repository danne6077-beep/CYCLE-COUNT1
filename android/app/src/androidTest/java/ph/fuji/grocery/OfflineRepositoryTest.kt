package ph.fuji.grocery

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import ph.fuji.grocery.data.*

@RunWith(AndroidJUnit4::class)
class OfflineRepositoryTest {
    @Test fun realSeedLookupCartAndFrozenTripWorkOffline() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val database = Room.inMemoryDatabaseBuilder(context, FujiDatabase::class.java).build()
        try {
            val repository = LocalRepository(database, context)
            repository.seed()
            assertFalse(repository.state.value.error)
            assertEquals(14076, repository.count.first())
            val all = repository.search("", "", false, emptySet(), 15000).first()
            assertEquals(50, all.count { !it.masterMatched })
            val coffee = repository.product("486522")!!
            assertEquals(1405L, coffee.price)
            assertTrue(repository.lookup(coffee.sku).any { it.sku == coffee.sku })
            val barcode = database.query("SELECT code FROM barcodes WHERE sku = ?", arrayOf(coffee.sku)).use { cursor -> assertTrue(cursor.moveToFirst()); cursor.getString(0) }
            assertTrue(repository.lookup(barcode).any { it.sku == coffee.sku })
            assertTrue(repository.lookup("not-in-your-list").isEmpty())
            repository.add(coffee); repository.add(coffee)
            val line = repository.basket.first().single()
            assertEquals(2, line.quantity)
            repository.shelfPrice(line, 1501)
            repository.finish(3000)
            val trip = repository.trips.first().single()
            assertEquals(3002L, trip.total)
            assertTrue(trip.linesJson.contains("1501"))
            assertTrue(repository.basket.first().isEmpty())
            assertEquals(1405L, repository.product(coffee.sku)!!.price)
            val csv = ph.fuji.grocery.util.tripCsv(trip)
            assertTrue(csv.contains("15.01")); assertTrue(csv.contains("30.02"))
            repository.seed()
            assertEquals(14076, repository.count.first())
            assertEquals(1, repository.trips.first().size)
        } finally { database.close() }
    }
}
