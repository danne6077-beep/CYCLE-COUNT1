package ph.fuji.grocery.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.fuji.grocery.BuildConfig
import ph.fuji.grocery.R

const val WEBSITE = "https://fujisupersystem-git-codex-fuji-shopper-hypermart-fuji-92d1.vercel.app/shopper/"

@Composable fun SettingsScreen(vm: ShopperViewModel) {
    val preferences by vm.preferences.collectAsStateWithLifecycle()
    var confirmation by remember { mutableIntStateOf(0) }
    val context = LocalContext.current
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item { SectionHeading(R.string.settings) }
        item {
            Card { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.appearance), style = MaterialTheme.typography.titleLarge)
                listOf("system" to R.string.theme_system, "light" to R.string.theme_light, "dark" to R.string.theme_dark).forEach { (value, label) ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(preferences?.theme == value, { vm.action { vm.settings.theme(value) } })
                        TextButton({ vm.action { vm.settings.theme(value) } }) { Text(stringResource(label)) }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { Text(stringResource(R.string.dynamic_color)); Text(stringResource(R.string.dynamic_hint), style = MaterialTheme.typography.bodySmall) }
                    Switch(preferences?.dynamicColor == true, { vm.action { vm.settings.dynamic(it) } })
                }
            } }
        }
        item { InfoCard(R.string.data_source, R.string.source_body) { Text(stringResource(R.string.savings_note), style = MaterialTheme.typography.bodyMedium) } }
        item {
            InfoCard(R.string.privacy, R.string.privacy_body) {
                TextButton({ vm.action { vm.settings.clearRecent() } }) { Text(stringResource(R.string.clear_recent)) }
                TextButton({ confirmation = 1 }) { Text(stringResource(R.string.clear_photos)) }
                TextButton({ confirmation = 2 }) { Text(stringResource(R.string.delete_data), color = MaterialTheme.colorScheme.error) }
            }
        }
        item { InfoCard(R.string.credits, R.string.credits_body) }
        item {
            OutlinedButton({ runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(WEBSITE))) } }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.website)) }
            Text(stringResource(R.string.website_note), style = MaterialTheme.typography.bodySmall)
        }
        item { Text(stringResource(R.string.version, BuildConfig.VERSION_NAME), style = MaterialTheme.typography.bodySmall) }
        item { PriceWarning() }
    }
    if (confirmation == 1) ConfirmDialog(R.string.clear_photos, R.string.clear_photos_body, { confirmation = 0 }, { vm.action { vm.repository.clearPhotos() }; confirmation = 0 })
    if (confirmation == 2) ConfirmDialog(R.string.delete_data, R.string.delete_data_body, { confirmation = 0 }, { vm.deletePrivateData(); confirmation = 0 })
}

@Composable private fun InfoCard(title: Int, body: Int, extra: @Composable ColumnScope.() -> Unit = {}) {
    Card { Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(stringResource(title), style = MaterialTheme.typography.titleLarge)
        Text(stringResource(body), style = MaterialTheme.typography.bodyMedium)
        extra()
    } }
}
