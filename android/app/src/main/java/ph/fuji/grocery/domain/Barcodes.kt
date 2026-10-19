package ph.fuji.grocery.domain

object Barcodes {
    fun valid(code: String): Boolean {
        if (code.length !in listOf(8, 12, 13, 14) || !code.all(Char::isDigit)) return false
        val sum = code.dropLast(1).reversed().mapIndexed { index, c -> c.digitToInt() * if (index % 2 == 0) 3 else 1 }.sum()
        return (10 - sum % 10) % 10 == code.last().digitToInt()
    }
    fun variants(raw: String): List<String> {
        val code = raw.trim().replace(Regex("\\s+"), "")
        if (code.length !in 1..100 || code.any(Char::isISOControl)) return emptyList()
        val result = linkedSetOf(code)
        if (code.matches(Regex("\\d{12}"))) result.add("0$code")
        if (code.matches(Regex("0\\d{12}"))) result.add(code.drop(1))
        if (code.matches(Regex("[01]\\d{7}"))) {
            val n = code[0]; val a = code[1]; val b = code[2]; val c = code[3]
            val d = code[4]; val e = code[5]; val f = code[6]; val x = code[7]
            val expanded = when (f) {
                '0', '1', '2' -> "$n$a${b}${f}0000$c$d$e$x"
                '3' -> "$n$a$b${c}00000$d$e$x"
                '4' -> "$n$a$b$c${d}00000$e$x"
                else -> "$n$a$b$c$d${e}0000$f$x"
            }
            if (valid(expanded)) { result.add(expanded); result.add("0$expanded") }
        }
        return result.toList()
    }
}
