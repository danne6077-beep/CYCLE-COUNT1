package ph.fuji.grocery.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ph.fuji.grocery.R
import ph.fuji.grocery.data.Product
import ph.fuji.grocery.domain.Money
import ph.fuji.grocery.ui.theme.FujiSpace

fun categoryIcon(category: String): ImageVector = when {
    category.contains("BEVERAGE") -> Icons.Rounded.LocalCafe
    category.contains("CARE") || category.contains("COSMETIC") -> Icons.Rounded.Spa
    category.contains("MILK") -> Icons.Rounded.WaterDrop
    category.contains("SNACK") || category.contains("BAKERY") -> Icons.Rounded.Cookie
    category.contains("STAPLE") || category.contains("GROCER") -> Icons.Rounded.RiceBowl
    category.contains("FRESH") -> Icons.Rounded.Eco
    category.contains("HOUSE") || category.contains("HARDWARE") -> Icons.Rounded.Home
    category.contains("GARMENT") || category.contains("APPAREL") -> Icons.Rounded.Checkroom
    else -> Icons.Rounded.ShoppingBag
}

/** Original, code-drawn grocery artwork. Not product photography. */
@Composable fun CategoryArt(category: String, modifier: Modifier = Modifier) {
    val palette = listOf(Color(0xFFD9E9CF), Color(0xFFEDE2C8), Color(0xFFD4E5E5), Color(0xFFE9D9D0))
    val shade = palette[(category.hashCode().toLong().let { if (it < 0) -it else it } % palette.size).toInt()]
    Box(modifier.background(shade, RoundedCornerShape(FujiSpace.corner)), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            drawCircle(Color.White.copy(alpha = .28f), size.minDimension * .49f, Offset(size.width * .75f, size.height * .2f))
            drawOval(Color(0xFF213F2A).copy(alpha = .1f), Offset(size.width * .23f, size.height * .76f), Size(size.width * .55f, size.height * .09f))
            drawRoundRect(Color.White.copy(alpha = .46f), Offset(size.width * .3f, size.height * .2f), Size(size.width * .4f, size.height * .56f), CornerRadius(15f, 15f))
        }
        Icon(categoryIcon(category), null, Modifier.size(54.dp), tint = Color(0xFF365D42))
    }
}

@Composable fun PriceWarning(modifier: Modifier = Modifier) {
    Surface(modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.surfaceContainer,
        shape = RoundedCornerShape(12.dp)) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Rounded.Info, null, Modifier.size(18.dp))
            Text(stringResource(R.string.price_warning), style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable fun ProductCard(product: Product, favorite: Boolean, open: () -> Unit, add: () -> Unit, toggleFavorite: () -> Unit) {
    Card(onClick = open, shape = RoundedCornerShape(FujiSpace.corner), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Box {
            CategoryArt(product.category, Modifier.fillMaxWidth().height(126.dp))
            FilledTonalIconButton(toggleFavorite, Modifier.align(Alignment.TopEnd).padding(4.dp)) {
                Icon(if (favorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                    stringResource(if (favorite) R.string.unfavorite else R.string.favorite))
            }
        }
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(product.category, style = MaterialTheme.typography.labelSmall, maxLines = 1, overflow = TextOverflow.Ellipsis, color = MaterialTheme.colorScheme.primary)
            Text(product.name, style = MaterialTheme.typography.titleMedium, minLines = 2, maxLines = 3, overflow = TextOverflow.Ellipsis)
            Text(stringResource(R.string.sku, product.sku), style = MaterialTheme.typography.bodySmall)
            Text(Money.format(product.price), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            FilledTonalButton(add, Modifier.fillMaxWidth()) { Icon(Icons.Rounded.Add, null, Modifier.size(18.dp)); Spacer(Modifier.width(4.dp)); Text(stringResource(R.string.add_short)) }
        }
    }
}

@Composable fun EmptyState(title: Int, hint: Int, icon: ImageVector = Icons.Rounded.ShoppingBag) {
    Column(Modifier.fillMaxWidth().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(icon, null, Modifier.size(56.dp), tint = MaterialTheme.colorScheme.primary)
        Text(stringResource(title), style = MaterialTheme.typography.titleLarge)
        Text(stringResource(hint), style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable fun SectionHeading(title: Int, back: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        if (back != null) IconButton(back) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back)) }
        Text(stringResource(title), style = MaterialTheme.typography.headlineMedium)
    }
}

@Composable fun ConfirmDialog(title: Int, body: Int, dismiss: () -> Unit, confirm: () -> Unit, label: Int = R.string.delete) {
    AlertDialog(onDismissRequest = dismiss, title = { Text(stringResource(title)) }, text = { Text(stringResource(body)) },
        confirmButton = { TextButton(confirm) { Text(stringResource(label)) } }, dismissButton = { TextButton(dismiss) { Text(stringResource(R.string.cancel)) } })
}

@Composable fun MoneyDialog(title: Int, initial: Long, dismiss: () -> Unit, save: (String) -> Boolean, hint: Int? = null) {
    var value by remember { mutableStateOf(if (initial == 0L) "" else java.math.BigDecimal.valueOf(initial, 2).toPlainString()) }
    var error by remember { mutableStateOf(false) }
    AlertDialog(onDismissRequest = dismiss, title = { Text(stringResource(title)) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(value, { value = it.take(15); error = false }, singleLine = true, label = { Text(stringResource(R.string.amount)) },
                prefix = { Text("₱") }, isError = error, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal))
            if (error) Text(stringResource(R.string.invalid_money), color = MaterialTheme.colorScheme.error)
            if (hint != null) Text(stringResource(hint), style = MaterialTheme.typography.bodySmall)
        }
    }, confirmButton = { TextButton({ if (save(value)) dismiss() else error = true }) { Text(stringResource(R.string.save)) } },
        dismissButton = { TextButton(dismiss) { Text(stringResource(R.string.cancel)) } })
}
