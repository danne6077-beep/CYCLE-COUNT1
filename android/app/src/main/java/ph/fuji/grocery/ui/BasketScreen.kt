package ph.fuji.grocery.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.fuji.grocery.R
import ph.fuji.grocery.data.BasketLine
import ph.fuji.grocery.domain.Money

@Composable fun BasketScreen(vm: ShopperViewModel) {
    val lines by vm.basket.collectAsStateWithLifecycle()
    val preferences by vm.preferences.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val total = Money.total(lines.map { it.price to it.quantity })
    val budget = preferences?.budget ?: 0L
    val state = Money.budgetState(total, budget)
    var showBudget by remember { mutableStateOf(false) }
    var editLine by remember { mutableStateOf<BasketLine?>(null) }
    var finish by remember { mutableStateOf(false) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { SectionHeading(R.string.basket) }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.subtotal), style = MaterialTheme.typography.labelLarge)
                    Text(Money.format(total), style = MaterialTheme.typography.headlineLarge)
                    val count = lines.sumOf { it.quantity }
                    Text(pluralStringResource(R.plurals.items_count, count, count))
                    if (budget > 0) {
                        LinearProgressIndicator(progress = { (total.toDouble() / budget).toFloat().coerceIn(0f, 1f) }, Modifier.fillMaxWidth(), color = if (state == 3) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary)
                        Text(stringResource(when (state) { 3 -> R.string.over_budget; 2 -> R.string.near_budget; else -> R.string.within_budget }))
                        Text(stringResource(if (total > budget) R.string.over_by else R.string.remaining, Money.format(kotlin.math.abs(budget - total))))
                    }
                    TextButton({ showBudget = true }) { Text(stringResource(if (budget == 0L) R.string.set_budget else R.string.change_budget)) }
                }
            }
        }
        if (lines.isEmpty()) item { EmptyState(R.string.empty_basket, R.string.empty_basket_hint) }
        items(lines, key = { it.sku }) { line ->
            Card {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(line.name, style = MaterialTheme.typography.titleMedium)
                    Text(stringResource(R.string.sku, line.sku), style = MaterialTheme.typography.bodySmall)
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(Money.format(line.price * line.quantity), style = MaterialTheme.typography.titleLarge)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconButton({ vm.action { vm.repository.quantity(line, -1) } }) { Icon(Icons.Rounded.Remove, stringResource(R.string.decrease)) }
                            val quantityLabel = stringResource(R.string.quantity, line.quantity)
                            Text(line.quantity.toString(), Modifier.widthIn(min = 24.dp).semantics { contentDescription = quantityLabel })
                            IconButton({ vm.action { vm.repository.quantity(line, 1) } }, enabled = line.quantity < 9999) { Icon(Icons.Rounded.Add, stringResource(R.string.increase)) }
                        }
                    }
                    Text(stringResource(if (line.shelfPrice) R.string.shelf_price else R.string.supplied_price) + " · " + Money.format(line.price), style = MaterialTheme.typography.bodySmall)
                    TextButton({ editLine = line }) { Icon(Icons.Rounded.Edit, null, Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.edit_shelf_price)) }
                }
            }
        }
        if (lines.isNotEmpty()) item { Button({ finish = true }, Modifier.fillMaxWidth(), enabled = !busy) { Text(stringResource(R.string.finish)) } }
        item { PriceWarning() }
    }
    if (showBudget) MoneyDialog(R.string.budget, budget, { showBudget = false }, vm::setBudget, R.string.budget_hint)
    editLine?.let { line -> MoneyDialog(R.string.edit_shelf_price, line.price, { editLine = null }, { raw ->
        val value = Money.parse(raw)
        if (value == null) false else { vm.action { vm.repository.shelfPrice(line, value) }; true }
    }) }
    if (finish) ConfirmDialog(R.string.finish_title, R.string.finish_body, { finish = false }, { finish = false; vm.finish() }, R.string.finish)
}
