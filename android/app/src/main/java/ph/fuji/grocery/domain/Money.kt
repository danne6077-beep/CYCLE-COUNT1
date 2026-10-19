package ph.fuji.grocery.domain

import java.text.NumberFormat
import java.util.Locale

object Money {
    const val MAX = 999_999_999L
    fun parse(raw: String): Long? {
        val value = raw.trim().removePrefix("₱").trim()
        if (value.contains(',') && !value.matches(Regex("\\d{1,3}(,\\d{3})+(\\.\\d{1,2})?"))) return null
        val plain = value.replace(",", "")
        if (!plain.matches(Regex("\\d+(\\.\\d{1,2})?"))) return null
        val parts = plain.split('.')
        val whole = parts[0].toLongOrNull() ?: return null
        if (whole > MAX / 100) return null
        return (whole * 100 + parts.getOrElse(1) { "" }.padEnd(2, '0').toLong()).takeIf { it <= MAX }
    }
    fun format(value: Long): String = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-PH"))
        .format(java.math.BigDecimal.valueOf(value, 2))
    fun total(lines: List<Pair<Long, Int>>): Long = lines.fold(0L) { sum, (price, quantity) ->
        require(price in 0..MAX && quantity in 1..9999)
        Math.addExact(sum, Math.multiplyExact(price, quantity.toLong()))
    }
    fun budgetState(total: Long, budget: Long): Int = when {
        budget <= 0 -> 0
        total > budget -> 3
        total * 100 >= budget * 80 -> 2
        else -> 1
    }
}
