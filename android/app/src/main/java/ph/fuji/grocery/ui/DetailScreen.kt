package ph.fuji.grocery.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.PlaylistAdd
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import ph.fuji.grocery.R
import ph.fuji.grocery.data.ListItem
import ph.fuji.grocery.data.Product
import ph.fuji.grocery.domain.Money
import ph.fuji.grocery.util.shareFile
import ph.fuji.grocery.util.shareText
import java.io.File

@Composable fun DetailScreen(vm: ShopperViewModel, sku: String, back: () -> Unit, open: (String) -> Unit) {
    val product by produceState<Product?>(null, sku) { value = vm.repository.product(sku) }
    val preferences by vm.preferences.collectAsStateWithLifecycle()
    val boards by vm.boards.collectAsStateWithLifecycle()
    val photo by remember(sku) { vm.repository.photo(sku) }.collectAsStateWithLifecycle(initialValue = null)
    val context = LocalContext.current
    var pickingList by remember { mutableStateOf(false) }
    var creatingList by remember { mutableStateOf(false) }
    var viewingPhoto by remember { mutableStateOf(false) }
    val photoPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri -> if (uri != null) vm.importPhoto(sku, uri) }
    val p = product
    if (p == null) {
        Column(Modifier.padding(16.dp)) { SectionHeading(R.string.details, back); CircularProgressIndicator() }
        return
    }
    val similar by remember(p.category) { vm.repository.search("", p.category, false, emptySet(), 8) }.collectAsStateWithLifecycle(initialValue = emptyList())
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { SectionHeading(R.string.details, back) }
        item {
            Box(Modifier.fillMaxWidth().height(260.dp)) {
                CategoryArt(p.category, Modifier.fillMaxSize())
                photo?.let { AsyncImage(File(it.path), stringResource(R.string.my_photo), Modifier.fillMaxSize().clickable { viewingPhoto = true }, contentScale = ContentScale.Fit) }
            }
        }
        item { Text(p.name, style = MaterialTheme.typography.headlineMedium) }
        item { Text(stringResource(R.string.sku, p.sku), style = MaterialTheme.typography.labelLarge) }
        item { Text(Money.format(p.price), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.primary) }
        item { Text(stringResource(R.string.price_date), style = MaterialTheme.typography.bodySmall) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                Button({ vm.add(p) }, Modifier.weight(1f)) { Icon(Icons.Rounded.AddShoppingCart, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.add)) }
                val favorite = preferences?.favorites?.contains(sku) == true
                FilledTonalIconButton({ vm.action { vm.settings.favorite(sku) } }) { Icon(if (favorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, stringResource(if (favorite) R.string.unfavorite else R.string.favorite)) }
            }
        }
        item { OutlinedButton({ pickingList = true }, Modifier.fillMaxWidth()) { Icon(Icons.AutoMirrored.Rounded.PlaylistAdd, null); Spacer(Modifier.width(8.dp)); Text(stringResource(R.string.save_to_list)) } }
        item {
            Card { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(if (p.masterMatched) R.string.master_match else R.string.master_unmatched), color = MaterialTheme.colorScheme.primary)
                Text(stringResource(R.string.category) + ": " + p.category)
                Text(stringResource(R.string.department) + ": " + p.department)
                Text(stringResource(R.string.unknown_size_stock), style = MaterialTheme.typography.bodyMedium)
            } }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton({ photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, Modifier.weight(1f)) {
                    Icon(Icons.Rounded.AddPhotoAlternate, null); Spacer(Modifier.width(6.dp)); Text(stringResource(R.string.add_photo))
                }
                IconButton({ runCatching { shareText(context, context.getString(R.string.share_item, p.name, p.sku, Money.format(p.price), context.getString(R.string.price_warning))) } }) { Icon(Icons.Rounded.Share, stringResource(R.string.share)) }
            }
        }
        if (photo != null) item { TextButton({ runCatching { shareFile(context, File(photo!!.path), "image/*") } }) { Text(stringResource(R.string.share_photo)) } }
        item { PriceWarning() }
        item { Text(stringResource(R.string.more_category), style = MaterialTheme.typography.titleLarge) }
        item { LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(similar.filter { it.sku != sku }, key = { it.sku }) { other -> Box(Modifier.width(180.dp)) {
                ProductCard(other, preferences?.favorites?.contains(other.sku) == true, { open(other.sku) }, { vm.add(other) }, { vm.action { vm.settings.favorite(other.sku) } })
            } }
        } }
    }
    if (pickingList) AlertDialog(onDismissRequest = { pickingList = false }, title = { Text(stringResource(R.string.save_to_list)) },
        text = { Column(Modifier.heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
            boards.forEach { board -> TextButton({ vm.action { vm.repository.listItem(ListItem(board.id, p.sku, p.name)) }; pickingList = false }) { Text(board.name) } }
            TextButton({ creatingList = true; pickingList = false }) { Text(stringResource(R.string.new_list)) }
        } }, confirmButton = { TextButton({ pickingList = false }) { Text(stringResource(R.string.cancel)) } })
    if (creatingList) NewListDialog({ creatingList = false }) { name -> vm.action { vm.repository.board(name) }; creatingList = false; pickingList = true }
    if (viewingPhoto && photo != null) Dialog({ viewingPhoto = false }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        var scale by remember { mutableFloatStateOf(1f) }
        var offset by remember { mutableStateOf(Offset.Zero) }
        Surface(Modifier.fillMaxSize(), color = Color.Black) {
            Box {
                AsyncImage(File(photo!!.path), stringResource(R.string.zoom_photo), Modifier.fillMaxSize()
                    .pointerInput(Unit) { detectTransformGestures { _, pan, zoom, _ -> scale = (scale * zoom).coerceIn(1f, 6f); offset = if (scale > 1) offset + pan else Offset.Zero } }
                    .graphicsLayer { scaleX = scale; scaleY = scale; translationX = offset.x; translationY = offset.y }, contentScale = ContentScale.Fit)
                IconButton({ viewingPhoto = false }, Modifier.align(Alignment.TopEnd).safeDrawingPadding()) { Icon(Icons.Rounded.Close, stringResource(R.string.close), tint = Color.White) }
            }
        }
    }
}
