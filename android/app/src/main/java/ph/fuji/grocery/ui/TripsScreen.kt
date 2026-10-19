package ph.fuji.grocery.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import org.json.JSONArray
import ph.fuji.grocery.R
import ph.fuji.grocery.domain.Money
import ph.fuji.grocery.util.shareTrip
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@Composable fun TripsScreen(vm: ShopperViewModel, back: () -> Unit) {
    val trips by vm.trips.collectAsStateWithLifecycle()
    val context = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { SectionHeading(R.string.past_trips, back) }
        if (trips.isEmpty()) item { EmptyState(R.string.empty_trips, R.string.empty_trips_hint, Icons.Rounded.History) }
        items(trips, key = { it.id }) { trip ->
            Card {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(DateTimeFormatter.ofPattern("d MMM yyyy · h:mm a").withZone(ZoneId.systemDefault()).format(Instant.parse(trip.date)), style = MaterialTheme.typography.titleMedium)
                    Text(Money.format(trip.total), style = MaterialTheme.typography.headlineMedium)
                    Text(stringResource(R.string.items_count, trip.count))
                    val lines = remember(trip.linesJson) { JSONArray(trip.linesJson) }
                    for (index in 0 until lines.length()) {
                        val line = lines.getJSONObject(index)
                        Text("${line.getInt("quantity")} × ${line.getString("name")} · ${Money.format(line.getLong("priceCentavos") * line.getInt("quantity"))}", style = MaterialTheme.typography.bodyMedium)
                    }
                    TextButton({ runCatching { shareTrip(context, trip) } }) { Icon(Icons.Rounded.Share, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.export_trip)) }
                }
            }
        }
        item { PriceWarning() }
    }
}
