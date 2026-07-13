package com.example.absensiprototype.ui.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.absensiprototype.domain.model.PunchType
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun HistoryScreen(
    viewModel: HistoryViewModel = koinViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()
            .padding(16.dp),
    ) {
        Text("Riwayat", style = MaterialTheme.typography.headlineMedium)
        Button(onClick = viewModel::refresh, modifier = Modifier.padding(vertical = 8.dp)) {
            Text("Refresh")
        }
        when {
            state.isLoading -> {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CircularProgressIndicator()
                }
            }
            state.error != null -> {
                Text(state.error!!, color = MaterialTheme.colorScheme.error)
            }
            state.isEmpty -> {
                Text("Belum ada riwayat absensi.")
            }
            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.items, key = { it.id }) { item ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    if (item.type == PunchType.CLOCK_IN) "Masuk" else "Keluar",
                                    style = MaterialTheme.typography.titleMedium,
                                )
                                Text(item.recordedAt)
                                Text(item.locationName ?: "—")
                                val flags = buildList {
                                    if (item.isLate) add("Terlambat")
                                    if (item.isEarly) add("Pulang cepat")
                                }.joinToString(", ")
                                if (flags.isNotBlank()) Text(flags)
                            }
                        }
                    }
                }
            }
        }
    }
}
