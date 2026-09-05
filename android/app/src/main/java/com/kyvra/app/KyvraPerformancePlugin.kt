package com.kyvra.app

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(name = "KyvraPerformance")
class KyvraPerformancePlugin : Plugin() {

    companion object {
        private const val TAG = "KyvraPerformance"
    }

    private data class ActiveTraceData(
        val name: String,
        val startTimeMs: Long,
        val metrics: ConcurrentHashMap<String, Long> = ConcurrentHashMap()
    )

    private val activeTraces = ConcurrentHashMap<String, ActiveTraceData>()

    @PluginMethod
    fun startTrace(call: PluginCall) {
        val traceName = call.getString("traceName")
        if (traceName.isNullOrEmpty()) {
            call.reject("traceName is required")
            return
        }

        activeTraces[traceName] = ActiveTraceData(traceName, System.currentTimeMillis())
        Log.d(TAG, "[Trace Start] '$traceName'")

        val ret = JSObject()
        ret.put("status", "started")
        ret.put("traceName", traceName)
        call.resolve(ret)
    }

    @PluginMethod
    fun stopTrace(call: PluginCall) {
        val traceName = call.getString("traceName")
        if (traceName.isNullOrEmpty()) {
            call.reject("traceName is required")
            return
        }

        val trace = activeTraces.remove(traceName)
        if (trace == null) {
            call.reject("No active trace found for name: $traceName")
            return
        }

        val elapsedMs = System.currentTimeMillis() - trace.startTimeMs
        val metrics = call.getObject("metrics")
        if (metrics != null) {
            val keys = metrics.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                trace.metrics[key] = metrics.getLong(key, 0L)
            }
        }

        Log.i(TAG, "[Trace Finished] '$traceName': took ${elapsedMs}ms | metrics: ${trace.metrics}")

        val ret = JSObject()
        ret.put("status", "stopped")
        ret.put("traceName", traceName)
        ret.put("elapsedMs", elapsedMs)
        call.resolve(ret)
    }

    @PluginMethod
    fun recordNetworkMetric(call: PluginCall) {
        val url = call.getString("url")
        val httpMethod = call.getString("httpMethod", "GET")
        val responseCode = call.getInt("responseCode", 200) ?: 200
        val durationMs = call.getLong("durationMs", 0L) ?: 0L
        val responsePayloadBytes = call.getLong("responsePayloadBytes", 0L) ?: 0L

        if (url.isNullOrEmpty()) {
            call.reject("url is required")
            return
        }

        Log.d(TAG, "[Network] $httpMethod $url -> Code: $responseCode | Duration: ${durationMs}ms | Size: ${responsePayloadBytes}B")

        val ret = JSObject()
        ret.put("status", "recorded")
        call.resolve(ret)
    }
}
