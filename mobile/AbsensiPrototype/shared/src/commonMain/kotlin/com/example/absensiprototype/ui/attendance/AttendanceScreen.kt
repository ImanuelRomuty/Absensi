package com.example.absensiprototype.ui.attendance

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeContentPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun AttendanceScreen(
    viewModel: AttendanceViewModel = koinViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Absensi", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Clock-in/out memakai GPS + geofence kantor.",
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center,
        )

        if (state.debugLines.isNotEmpty()) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("Status lokasi", style = MaterialTheme.typography.titleSmall)
                state.debugLines.forEach { line ->
                    Text(line, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        OutlinedButton(
            onClick = viewModel::refreshGps,
            enabled = !state.isLoading && !state.isRefreshingGps,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (state.isRefreshingGps) "Memuat GPS…" else "Refresh GPS / jarak kantor")
        }

        if (state.pendingCount > 0) {
            Text("Antrian offline: ${state.pendingCount}")
            OutlinedButton(onClick = viewModel::flushQueue, modifier = Modifier.fillMaxWidth()) {
                Text("Kirim ulang antrian")
            }
        }
        if (state.isLoading) {
            CircularProgressIndicator()
        } else {
            Button(onClick = viewModel::clockIn, modifier = Modifier.fillMaxWidth()) {
                Text("Clock In")
            }
            OutlinedButton(onClick = viewModel::clockOut, modifier = Modifier.fillMaxWidth()) {
                Text("Clock Out")
            }
        }
        state.message?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, textAlign = TextAlign.Center)
        }
        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
        }
    }
}
