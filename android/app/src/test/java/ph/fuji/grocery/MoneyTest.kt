package ph.fuji.grocery

import org.junit.Assert.*
import org.junit.Test
import ph.fuji.grocery.domain.Money
import ph.fuji.grocery.domain.Barcodes

class MoneyTest {
    @Test fun pricesAreExactCentavos() {
        assertEquals(1405L, Money.parse("14.05"))
        assertEquals(123456L, Money.parse("₱1,234.56"))
        assertEquals(21L, Money.parse("0.21"))
        assertEquals(40174L, Money.total(listOf(5029L to 2, 6029L to 1, 7029L to 1, 8029L to 1, 9029L to 1)))
        assertEquals(999_999_999L, Money.parse("9999999.99"))
    }
    @Test fun invalidMoneyIsNeverSilentlyCoerced() {
        listOf("", "-1", "NaN", "1e3", "0.209", "1,00", "1.2.3", "10000000", "99999999999999999999999").forEach { assertNull(it, Money.parse(it)) }
    }
    @Test fun budgetBoundariesMatchWebsite() {
        assertEquals(0, Money.budgetState(100, 0))
        assertEquals(1, Money.budgetState(7999, 10000))
        assertEquals(2, Money.budgetState(8000, 10000))
        assertEquals(2, Money.budgetState(10000, 10000))
        assertEquals(3, Money.budgetState(10001, 10000))
    }
    @Test(expected = IllegalArgumentException::class) fun invalidQuantitiesAreBlocked() { Money.total(listOf(1L to -2)) }
    @Test fun barcodeStringsPreserveZerosAndExpandOnlyValidUpce() {
        assertTrue(Barcodes.variants("036000291452").contains("0036000291452"))
        assertTrue(Barcodes.variants("0036000291452").contains("036000291452"))
        assertTrue(Barcodes.variants("04252614").contains("042100005264"))
        assertEquals(listOf("04252615"), Barcodes.variants("04252615"))
        assertTrue(Barcodes.variants("x".repeat(101)).isEmpty())
    }
}
