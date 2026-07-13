package com.example.absensiprototype.ui.leave

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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun LeaveScreen(
    viewModel: LeaveViewModel = koinViewModel(),
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .safeContentPadding()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Cuti", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Ajukan cuti; manager/HR approve di web admin.",
            style = MaterialTheme.typography.bodyMedium,
        )

        if (state.isLoading) {
            CircularProgressIndicator()
            return@Column
        }

        Text("Saldo tahun ini", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
        if (state.balances.isEmpty()) {
            Text("Belum ada saldo cuti. Hubungi HR / tunggu seed API.", modifier = Modifier.fillMaxWidth())
        } else {
            state.balances.forEach { bal ->
                Text(
                    "${bal.leaveTypeName}: sisa ${bal.remainingDays} / ${bal.entitledDays} hari (terpakai ${bal.usedDays})",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        Text("Ajukan cuti", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
        if (state.types.isNotEmpty()) {
            Text("Jenis cuti (pilih ID di bawah):", style = MaterialTheme.typography.bodySmall, modifier = Modifier.fillMaxWidth())
            state.types.forEach { type ->
                val selected = type.id == state.selectedTypeId
                OutlinedButton(
                    onClick = { viewModel.onTypeChange(type.id) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("${if (selected) "✓ " else ""}${type.name} (${type.code})")
                }
            }
        }
        OutlinedTextField(
            value = state.startDate,
            onValueChange = viewModel::onStartChange,
            label = { Text("Mulai (YYYY-MM-DD)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = state.endDate,
            onValueChange = viewModel::onEndChange,
            label = { Text("Selesai (YYYY-MM-DD)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = state.reason,
            onValueChange = viewModel::onReasonChange,
            label = { Text("Alasan (opsional)") },
            modifier = Modifier.fillMaxWidth(),
        )

        if (state.isSubmitting) {
            CircularProgressIndicator()
        } else {
            Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth()) {
                Text("Kirim pengajuan")
            }
            OutlinedButton(onClick = viewModel::refresh, modifier = Modifier.fillMaxWidth()) {
                Text("Refresh")
            }
        }

        state.message?.let {
            Text(it, color = MaterialTheme.colorScheme.primary, modifier = Modifier.fillMaxWidth())
        }
        state.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.fillMaxWidth())
        }

        Text("Riwayat pengajuan", style = MaterialTheme.typography.titleSmall, modifier = Modifier.fillMaxWidth())
        if (state.requests.isEmpty()) {
            Text("Belum ada pengajuan.", modifier = Modifier.fillMaxWidth())
        } else {
            state.requests.forEach { req ->
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    Text("${req.leaveTypeName} · ${req.startDate} → ${req.endDate} (${req.days} hari)")
                    Text("Status: ${req.status}", style = MaterialTheme.typography.bodySmall)
                    if (req.status == "PENDING") {
                        OutlinedButton(onClick = { viewModel.cancel(req.id) }) {
                            Text("Batalkan")
                        }
                    }
                }
            }
        }
    }
}
