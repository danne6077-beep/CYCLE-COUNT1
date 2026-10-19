package ph.fuji.grocery.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ListAlt
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.*
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import kotlinx.coroutines.launch
import ph.fuji.grocery.R

private data class Destination(val route: String, val label: Int, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val destinations = listOf(Destination("shop", R.string.shop, Icons.Rounded.Storefront),
    Destination("basket", R.string.basket, Icons.Rounded.ShoppingBasket), Destination("lists", R.string.lists, Icons.AutoMirrored.Rounded.ListAlt),
    Destination("favorites", R.string.favorites, Icons.Rounded.FavoriteBorder), Destination("more", R.string.more, Icons.Rounded.Tune))

@OptIn(ExperimentalMaterial3Api::class)
@Composable fun FujiApp(vm: ShopperViewModel) {
    val preferences by vm.preferences.collectAsStateWithLifecycle()
    val catalog by vm.repository.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val context = androidx.compose.ui.platform.LocalContext.current
    LaunchedEffect(vm) { vm.messages.collect { snackbar.showSnackbar(context.getString(it)) } }
    Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        if (preferences == null || catalog.loading || catalog.error) {
            Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.brand), style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.primary)
                if (!catalog.error) CircularProgressIndicator()
                Text(stringResource(if (catalog.error) R.string.catalog_error else R.string.loading))
                Text(stringResource(R.string.loading_hint), style = MaterialTheme.typography.bodyMedium)
                if (catalog.error) Button(vm::retry) { Text(stringResource(R.string.retry)) }
            }
            return@Surface
        }
        if (preferences?.welcomed != true) { Onboarding { vm.action { vm.settings.welcome() } }; return@Surface }
        val nav = rememberNavController()
        val entry by nav.currentBackStackEntryAsState()
        val route = entry?.destination?.route ?: "shop"
        var manual by remember { mutableStateOf(false) }
        val matches by vm.matches.collectAsStateWithLifecycle()
        val scanner = rememberLauncherForActivityResult(ScanContract()) { result ->
            if (result.contents != null) vm.lookup(result.contents) else manual = true
        }
        val scanPrompt = stringResource(R.string.scan_prompt)
        val scan = { scanner.launch(ScanOptions().setDesiredBarcodeFormats(ScanOptions.ALL_CODE_TYPES)
            .setPrompt(scanPrompt).setBeepEnabled(false).setOrientationLocked(false)) }
        fun navigate(destination: String) { nav.navigate(destination) { launchSingleTop = true; popUpTo("shop") { saveState = true }; restoreState = true } }
        LaunchedEffect(route) { if (route == "shop" || route == "favorites") vm.favorites(route == "favorites") }
        BoxWithConstraints {
            val wide = maxWidth >= 840.dp
            Scaffold(snackbarHost = { SnackbarHost(snackbar) }, topBar = {
                Column {
                    TopAppBar(title = { Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.brand), fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.width(12.dp)); Text(stringResource(R.string.offline_ready), style = MaterialTheme.typography.labelSmall)
                    } }, actions = {
                        IconButton({ navigate("trips") }) { Icon(Icons.Rounded.History, stringResource(R.string.past_trips)) }
                        IconButton({ scan() }) { Icon(Icons.Rounded.QrCodeScanner, stringResource(R.string.scan)) }
                    })
                    PriceWarning(Modifier.padding(horizontal = 16.dp).padding(bottom = 8.dp))
                }
            }, bottomBar = {
                if (!wide) NavigationBar { destinations.forEach { d ->
                    NavigationBarItem(selected = route == d.route, onClick = { navigate(d.route) }, icon = { Icon(d.icon, null) }, label = { Text(stringResource(d.label)) })
                } }
            }) { padding ->
                Row(Modifier.padding(padding).fillMaxSize()) {
                    if (wide) NavigationRail { destinations.forEach { d ->
                        NavigationRailItem(selected = route == d.route, onClick = { navigate(d.route) }, icon = { Icon(d.icon, null) }, label = { Text(stringResource(d.label)) })
                    } }
                    NavHost(nav, startDestination = "shop", modifier = Modifier.weight(1f)) {
                        composable("shop") { CatalogScreen(vm, false, { nav.navigate("detail/$it") }, { manual = true }) }
                        composable("favorites") { CatalogScreen(vm, true, { nav.navigate("detail/$it") }, { manual = true }) }
                        composable("basket") { BasketScreen(vm) }
                        composable("lists") { ListsScreen(vm) { nav.navigate("detail/$it") } }
                        composable("more") { SettingsScreen(vm) }
                        composable("trips") { TripsScreen(vm) { nav.popBackStack() } }
                        composable("detail/{sku}") { backStack -> DetailScreen(vm, backStack.arguments?.getString("sku") ?: "", { nav.popBackStack() }, { nav.navigate("detail/$it") }) }
                    }
                }
            }
        }
        if (manual) {
            var code by remember { mutableStateOf("") }
            AlertDialog(onDismissRequest = { manual = false }, title = { Text(stringResource(R.string.manual_lookup)) },
                text = { OutlinedTextField(code, { code = it.take(100) }, singleLine = true, label = { Text(stringResource(R.string.manual_lookup)) }) },
                confirmButton = { TextButton({ vm.lookup(code); manual = false }, enabled = code.isNotBlank()) { Text(stringResource(R.string.lookup)) } },
                dismissButton = { TextButton({ manual = false }) { Text(stringResource(R.string.cancel)) } })
        }
        matches?.let { items -> AlertDialog(onDismissRequest = { vm.matches.value = null }, title = { Text(stringResource(R.string.lookup_results)) },
            text = { Column(Modifier.heightIn(max = 420.dp).then(Modifier), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (items.isEmpty()) Text(stringResource(R.string.not_found))
                if (items.size > 1) Text(stringResource(R.string.multiple_matches))
                items.take(8).forEach { product ->
                    TextButton({ vm.matches.value = null; nav.navigate("detail/${product.sku}") }) { Text(product.name) }
                    FilledTonalButton({ vm.add(product); vm.matches.value = null }) { Text(stringResource(R.string.add)) }
                }
            } }, confirmButton = { TextButton({ vm.matches.value = null }) { Text(stringResource(R.string.done)) } }) }
    }
}

@Composable private fun Onboarding(finish: () -> Unit) {
    val pager = rememberPagerState(pageCount = { 3 })
    val scope = rememberCoroutineScope()
    val titles = listOf(R.string.welcome_plan, R.string.welcome_scan, R.string.welcome_budget)
    val bodies = listOf(R.string.welcome_plan_body, R.string.welcome_scan_body, R.string.welcome_budget_body)
    Column(Modifier.fillMaxSize().safeDrawingPadding().padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        Text(stringResource(R.string.app_name), style = MaterialTheme.typography.titleLarge)
        HorizontalPager(pager, Modifier.weight(1f)) { page ->
            Column(verticalArrangement = Arrangement.spacedBy(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                CategoryArt(listOf("STAPLE", "BEVERAGE", "FRESH")[page], Modifier.fillMaxWidth().height(230.dp))
                Text(stringResource(titles[page]), style = MaterialTheme.typography.headlineLarge)
                Text(stringResource(bodies[page]), style = MaterialTheme.typography.bodyLarge)
            }
        }
        Text(stringResource(R.string.step, pager.currentPage + 1), style = MaterialTheme.typography.labelLarge)
        PriceWarning()
        Button({ if (pager.currentPage == 2) finish() else scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } }, Modifier.fillMaxWidth().heightIn(min = 52.dp)) {
            Text(stringResource(if (pager.currentPage == 2) R.string.start_shopping else R.string.next))
        }
    }
}
