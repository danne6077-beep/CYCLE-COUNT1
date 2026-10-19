package ph.fuji.grocery.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import org.json.JSONArray
import ph.fuji.grocery.R
import ph.fuji.grocery.data.Trip
import java.io.File

fun shareText(context: Context, text: String) {
    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"; putExtra(Intent.EXTRA_TEXT, text)
    }, context.getString(R.string.share)))
}
private fun cell(raw: String): String {
    val text = if (raw.trimStart().firstOrNull() in listOf('=', '+', '-', '@')) "'$raw" else raw
    return "\"${text.replace("\"", "\"\"")}\""
}
fun tripCsv(trip: Trip): String {
    val rows = mutableListOf("SKU,Name,Quantity,Unit price PHP,Line estimate PHP,Price source")
    val lines = JSONArray(trip.linesJson)
    for (i in 0 until lines.length()) {
        val item = lines.getJSONObject(i)
        val price = item.getLong("priceCentavos")
        val quantity = item.getInt("quantity")
        rows.add(listOf(item.getString("sku"), item.getString("name"), quantity.toString(),
            java.math.BigDecimal.valueOf(price, 2).toPlainString(), java.math.BigDecimal.valueOf(price * quantity, 2).toPlainString(),
            if (item.optBoolean("shelfPrice")) "Private shelf observation" else "Supplied price list; effective date unknown").joinToString(",", transform = ::cell))
    }
    return rows.joinToString("\r\n") + "\r\n"
}
fun shareTrip(context: Context, trip: Trip) {
    val directory = File(context.cacheDir, "exports").apply { mkdirs() }
    val file = File(directory, "fuji-trip-${trip.id}.csv")
    file.writeText("\uFEFF" + tripCsv(trip))
    shareFile(context, file, "text/csv")
}
fun shareFile(context: Context, file: File, mime: String) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
    context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
        type = mime; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        clipData = android.content.ClipData.newRawUri(context.getString(R.string.share), uri)
    }, context.getString(R.string.share)))
}
