package ph.fuji.grocery.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.fuji.grocery.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun CatalogScreen(vm: ShopperViewModel, favoriteOnly: Boolean, open: (String) -> Unit, manual: () -> Unit) {
    val products by vm.products.collectAsStateWithLifecycle()
    val filter by vm.filter.collectAsStateWithLifecycle()
    val categories by vm.categories.collectAsStateWithLifecycle()
    val count by vm.count.collectAsStateWithLifecycle()
    val preferences by vm.preferences.collectAsStateWithLifecycle()
    val keyboard = LocalSoftwareKeyboardController.current
    val grid = rememberLazyGridState()
    PullToRefreshBox(isRefreshing = false, onRefresh = vm::retry) {
        LazyVerticalGrid(columns = GridCells.Adaptive(158.dp), state = grid,
            contentPadding = PaddingValues(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (favoriteOnly) SectionHeading(R.string.favorites) else {
                        Text(stringResource(R.string.browse_heading), style = MaterialTheme.typography.headlineLarge)
                        Text(stringResource(R.string.browse_intro), style = MaterialTheme.typography.bodyMedium)
                    }
                    OutlinedTextField(filter.query, vm::query, Modifier.fillMaxWidth(), singleLine = true,
                        label = { Text(stringResource(R.string.search)) }, leadingIcon = { Icon(Icons.Rounded.Search, null) },
                        trailingIcon = { if (filter.query.isNotEmpty()) IconButton({ vm.query("") }) { Icon(Icons.Rounded.Close, stringResource(R.string.clear_search)) } },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                        keyboardActions = KeyboardActions(onSearch = { vm.rememberSearch(); keyboard?.hide() }))
                    if (filter.query.isEmpty() && preferences?.recent?.isNotEmpty() == true) {
                        Text(stringResource(R.string.recent_searches), style = MaterialTheme.typography.labelLarge)
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { items(preferences?.recent ?: emptyList()) { recent ->
                            SuggestionChip(onClick = { vm.query(recent) }, label = { Text(recent) }, modifier = Modifier.heightIn(min = 48.dp))
                        } }
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item { FilterChip(selected = filter.category.isEmpty(), onClick = { vm.category("") }, label = { Text(stringResource(R.string.all)) }, modifier = Modifier.heightIn(min = 48.dp)) }
                        items(categories) { category -> FilterChip(selected = filter.category == category,
                            onClick = { vm.category(if (filter.category == category) "" else category) }, label = { Text(category) }, modifier = Modifier.heightIn(min = 48.dp)) }
                    }
                    Text(stringResource(R.string.catalog_count, count), style = MaterialTheme.typography.labelLarge)
                    Text(stringResource(R.string.price_date), style = MaterialTheme.typography.bodySmall)
                    OutlinedButton(manual) { Icon(Icons.Rounded.Dialpad, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.manual_lookup)) }
                }
            }
            if (products.isEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
                EmptyState(if (favoriteOnly) R.string.empty_favorites else R.string.empty_search,
                    if (favoriteOnly) R.string.empty_favorites_hint else R.string.empty_search_hint,
                    if (favoriteOnly) Icons.Rounded.FavoriteBorder else Icons.Rounded.SearchOff)
            }
            items(products, key = { it.sku }) { product -> ProductCard(product,
                preferences?.favorites?.contains(product.sku) == true, { vm.rememberSearch(); open(product.sku) }, { vm.add(product) }, { vm.action { vm.settings.favorite(product.sku) } }) }
            if (products.size >= filter.limit) item(span = { GridItemSpan(maxLineSpan) }) {
                OutlinedButton(vm::loadMore, Modifier.fillMaxWidth()) { Text(stringResource(R.string.load_more)) }
            }
            item(span = { GridItemSpan(maxLineSpan) }) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.catalog_note), style = MaterialTheme.typography.bodySmall)
                    Text(stringResource(R.string.refresh_note), style = MaterialTheme.typography.bodySmall)
                    TextButton(vm::retry) { Text(stringResource(R.string.refresh)) }
                }
            }
        }
    }
}
