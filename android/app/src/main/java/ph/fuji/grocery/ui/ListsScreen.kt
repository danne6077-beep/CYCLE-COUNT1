package ph.fuji.grocery.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ph.fuji.grocery.R
import ph.fuji.grocery.data.Board

@Composable fun ListsScreen(vm: ShopperViewModel, open: (String) -> Unit) {
    val boards by vm.boards.collectAsStateWithLifecycle()
    val items by vm.listItems.collectAsStateWithLifecycle()
    var creating by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Board?>(null) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item { SectionHeading(R.string.lists) }
        item { Button({ creating = true }) { Icon(Icons.Rounded.Add, null); Text(stringResource(R.string.new_list)) } }
        if (boards.isEmpty()) item { EmptyState(R.string.empty_lists, R.string.empty_lists_hint) }
        boards.forEach { board ->
            item(key = board.id) {
                Card {
                    Column(Modifier.fillMaxWidth().padding(16.dp)) {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(board.name, Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                            IconButton({ deleting = board }) { Icon(Icons.Rounded.DeleteOutline, stringResource(R.string.delete_list)) }
                        }
                        val saved = items.filter { it.boardId == board.id }
                        if (saved.isEmpty()) Text(stringResource(R.string.list_empty), style = MaterialTheme.typography.bodyMedium)
                        saved.forEach { item ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                val checkLabel = stringResource(R.string.list_checked) + ": " + item.name
                                Checkbox(item.checked, { vm.action { vm.repository.listItem(item.copy(checked = it)) } }, Modifier.semantics { contentDescription = checkLabel })
                                TextButton({ open(item.sku) }, Modifier.weight(1f)) { Text(item.name) }
                                IconButton({ vm.action { vm.repository.product(item.sku)?.let { vm.repository.add(it) } } }) { Icon(Icons.Rounded.AddShoppingCart, stringResource(R.string.add)) }
                                IconButton({ vm.action { vm.repository.removeListItem(item) } }) { Icon(Icons.Rounded.Close, stringResource(R.string.remove)) }
                            }
                        }
                    }
                }
            }
        }
    }
    if (creating) NewListDialog({ creating = false }) { name -> vm.action { vm.repository.board(name) }; creating = false }
    deleting?.let { board -> ConfirmDialog(R.string.delete_list, R.string.delete_list_body, { deleting = null }, { vm.action { vm.repository.deleteBoard(board.id) }; deleting = null }) }
}

@Composable fun NewListDialog(dismiss: () -> Unit, save: (String) -> Unit) {
    var name by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = dismiss, title = { Text(stringResource(R.string.new_list)) },
        text = { OutlinedTextField(name, { name = it.take(60) }, singleLine = true, label = { Text(stringResource(R.string.list_name)) }) },
        confirmButton = { TextButton({ save(name.trim()) }, enabled = name.isNotBlank()) { Text(stringResource(R.string.save)) } },
        dismissButton = { TextButton(dismiss) { Text(stringResource(R.string.cancel)) } })
}
