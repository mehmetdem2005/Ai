package com.example.llama

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.StatFs
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.arm.aichat.AiChat
import com.arm.aichat.InferenceEngine
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import java.io.File
import java.io.IOException
import java.io.RandomAccessFile
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.Locale
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {
    private val background = Color.rgb(10, 15, 26)
    private val surface = Color.rgb(25, 34, 51)
    private val primary = Color.rgb(82, 133, 244)
    private val muted = Color.rgb(166, 180, 201)
    private val white = Color.rgb(242, 247, 255)
    private lateinit var status: TextView
    private lateinit var progress: ProgressBar
    private lateinit var retry: Button
    private lateinit var transcript: LinearLayout
    private lateinit var scroll: ScrollView
    private lateinit var input: EditText
    private lateinit var send: Button
    private lateinit var engine: InferenceEngine
    private var modelReady = false
    private var busy = false
    private var setup: Job? = null
    private var generation: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = background
        window.navigationBarColor = background
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        buildUI()
        setupModel()
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).roundToInt()
    private fun bg(color: Int): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dp(16).toFloat()
    }
    private fun txt(s: String, size: Float, color: Int = white, bold: Boolean = false): TextView =
        TextView(this).apply {
            text = s
            textSize = size
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
        }

    private fun buildUI() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(this@MainActivity.background)
            setPadding(dp(14), dp(14), dp(14), dp(12))
        }
        setContentView(root)
        root.addView(txt("QWEN 3.5", 22f, white, true))
        root.addView(txt("4B · Q4_K_M · Telefonda yerel sohbet", 12f, muted))

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = bg(surface)
            setPadding(dp(14), dp(12), dp(14), dp(12))
        }
        root.addView(panel, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(14)
            bottomMargin = dp(10)
        })
        status = txt("Başlatılıyor...", 13f)
        panel.addView(status)
        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 1000
            isIndeterminate = true
        }
        panel.addView(progress, LinearLayout.LayoutParams(-1, dp(6)).apply { topMargin = dp(8) })
        retry = Button(this).apply {
            text = "Tekrar dene"
            visibility = View.GONE
            setOnClickListener { setupModel() }
        }
        panel.addView(retry)

        scroll = ScrollView(this).apply { isFillViewport = true }
        transcript = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(2), dp(12), dp(2), dp(14))
        }
        scroll.addView(transcript)
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        bubble("Model indirildikten sonra sohbet internet olmadan çalışır.", false)

        val composer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
        }
        input = EditText(this).apply {
            hint = "Mesajını yaz..."
            setHintTextColor(muted)
            setTextColor(white)
            background = bg(surface)
            setPadding(dp(12), dp(8), dp(12), dp(8))
            minLines = 1
            maxLines = 5
            isSingleLine = false
            isEnabled = false
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE or
                android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
        }
        composer.addView(input, LinearLayout.LayoutParams(0, -2, 1f))
        send = Button(this).apply {
            text = "Gönder"
            isEnabled = false
            setTextColor(white)
            setBackgroundColor(primary)
            setOnClickListener { if (busy) generation?.cancel() else sendMessage() }
        }
        composer.addView(send, LinearLayout.LayoutParams(dp(100), dp(54)).apply { leftMargin = dp(7) })
        root.addView(composer)
    }

    private fun showStatus(message: String, fraction: Float? = null, failure: Boolean = false) {
        runOnUiThread {
            status.text = message
            progress.isIndeterminate = fraction == null && !failure
            if (fraction != null) progress.progress = (fraction * 1000f).toInt().coerceIn(0, 1000)
            progress.visibility = if (failure || modelReady) View.GONE else View.VISIBLE
            retry.visibility = if (failure) View.VISIBLE else View.GONE
            composerEnabled()
        }
    }

    private fun composerEnabled() {
        input.isEnabled = modelReady && !busy
        send.isEnabled = modelReady
        send.text = if (busy) "Durdur" else "Gönder"
    }

    private fun setupModel() {
        if (setup?.isActive == true) return
        modelReady = false
        showStatus("Model hazırlanıyor...")
        setup = lifecycleScope.launch {
            try {
                val file = ModelStore(applicationContext).ensureModel { bytes, total ->
                    val percent = bytes.toDouble() / total
                    showStatus(
                        "İndiriliyor: %.1f%% · %.2f / %.2f GB".format(
                            Locale.ROOT, percent * 100, bytes / 1e9, total / 1e9
                        ), percent.toFloat()
                    )
                }
                showStatus("Model belleğe yükleniyor...")
                engine = AiChat.getInferenceEngine(applicationContext)
                val state = withTimeout(90_000L) {
                    engine.state.first {
                        it is InferenceEngine.State.Initialized ||
                        it is InferenceEngine.State.ModelReady ||
                        it is InferenceEngine.State.Error
                    }
                }
                if (state is InferenceEngine.State.Error) throw state.exception
                if (state is InferenceEngine.State.Initialized)
                    withContext(Dispatchers.IO) { engine.loadModel(file.absolutePath) }
                modelReady = true
                showStatus("Hazır · Artık çevrimdışı sohbet edebilirsin", 1f)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                modelReady = false
                showStatus("Kurulum hatası: " + (e.message ?: e.javaClass.simpleName), failure = true)
            } catch (e: LinkageError) {
                modelReady = false
                showStatus("Model motoru açılamadı: " + e.message, failure = true)
            }
        }
    }

    private fun bubble(message: String, user: Boolean): TextView {
        val row = LinearLayout(this).apply {
            gravity = if (user) Gravity.END else Gravity.START
            orientation = LinearLayout.HORIZONTAL
        }
        val view = txt(message, 15f).apply {
            background = bg(if (user) primary else surface)
            setPadding(dp(13), dp(10), dp(13), dp(10))
            setTextIsSelectable(true)
        }
        row.addView(view, LinearLayout.LayoutParams(-2, -2))
        transcript.addView(row, LinearLayout.LayoutParams(-1, -2).apply {
            topMargin = dp(7)
            bottomMargin = dp(7)
        })
        scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
        return view
    }

    private fun sendMessage() {
        val msg = input.text.toString().trim()
        if (msg.isEmpty() || !modelReady || busy) return
        input.text.clear()
        (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager)
            .hideSoftInputFromWindow(input.windowToken, 0)
        bubble(msg, true)
        val answer = bubble("...", false)
        busy = true
        composerEnabled()
        generation = lifecycleScope.launch {
            val result = StringBuilder()
            try {
                engine.sendUserPrompt(msg, 384).collect { token ->
                    result.append(token)
                    answer.text = result.toString().ifBlank { "..." }
                    scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
                }
            } catch (e: CancellationException) {
                answer.text = result.toString().ifBlank { "Üretim durduruldu." }
            } catch (e: Exception) {
                answer.text = "Yanıt üretilemedi: " + e.message
            } finally {
                busy = false
                composerEnabled()
            }
        }
    }

    override fun onDestroy() {
        generation?.cancel()
        setup?.cancel()
        super.onDestroy()
    }
}

internal class ModelStore(private val context: Context) {
    companion object {
        private const val NAME = "Qwen3.5-4B-Q4_K_M.gguf"
        private const val SIZE = 2_783_446_752L
        private const val SHA256 = "fd68ce71f4225ebd0f33c5ddddb9dc612349e20189c213c24363ec787fd2a398"
        private const val URL = "https://huggingface.co/Boollm/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf?download=true"
    }

    suspend fun ensureModel(progress: (Long, Long) -> Unit): File = withContext(Dispatchers.IO) {
        val dir = File(context.filesDir, "models")
        check(dir.isDirectory || dir.mkdirs()) { "Model klasörü oluşturulamadı" }
        val model = File(dir, NAME)
        val prefs = context.getSharedPreferences("model-integrity", Context.MODE_PRIVATE)
        if (model.length() == SIZE && prefs.getBoolean(SHA256, false)) return@withContext model
        if (model.exists() && model.length() == SIZE && verify(model)) {
            prefs.edit().putBoolean(SHA256, true).apply()
            return@withContext model
        }
        if (model.exists()) model.delete()
        prefs.edit().putBoolean(SHA256, false).apply()

        val part = File(dir, "$NAME.part")
        if (part.length() > SIZE) part.delete()
        if (part.length() == SIZE) {
            if (verify(part)) {
                check(part.renameTo(model)) { "Model taşınamadı" }
                prefs.edit().putBoolean(SHA256, true).apply()
                return@withContext model
            }
            part.delete()
        }
        val remaining = SIZE - part.length()
        require(StatFs(dir.absolutePath).availableBytes > remaining + 160_000_000L) {
            "Yeterli boş alan yok. En az %.1f GB gerekiyor.".format(Locale.ROOT, (remaining + 160_000_000L) / 1e9)
        }

        val conn = (URL(URL).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000
            readTimeout = 50_000
            instanceFollowRedirects = true
            setRequestProperty("User-Agent", "Qwen35Pocket/1.0")
            if (part.length() > 0) setRequestProperty("Range", "bytes=" + part.length() + "-")
        }
        try {
            val response = conn.responseCode
            if (response != HttpURLConnection.HTTP_OK && response != HttpURLConnection.HTTP_PARTIAL)
                throw IOException("HTTP " + response + ": model indirilemedi")
            if (response == HttpURLConnection.HTTP_PARTIAL) {
                val range = conn.getHeaderField("Content-Range") ?: ""
                require(range.startsWith("bytes " + part.length() + "-")) { "İndirme aralığı yanlış" }
                require(range.endsWith("/" + SIZE)) { "Sunucudaki dosya boyutu değişti" }
            }
            val start = if (response == HttpURLConnection.HTTP_PARTIAL) part.length() else 0L
            RandomAccessFile(part, "rw").use { file ->
                file.setLength(start)
                file.seek(start)
                var written = start
                var last = 0L
                conn.inputStream.use { input ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        file.write(buf, 0, n)
                        written += n
                        if (written > SIZE) throw IOException("Dosya beklenenden büyük")
                        val now = System.currentTimeMillis()
                        if (now - last >= 700) {
                            progress(written, SIZE)
                            last = now
                        }
                    }
                }
            }
        } finally {
            conn.disconnect()
        }
        require(part.length() == SIZE) { "İndirme yarıda kaldı; tekrar açıldığında devam edecek" }
        progress(SIZE, SIZE)
        if (!verify(part)) {
            part.delete()
            throw IOException("SHA-256 kontrolü başarısız. Bozuk indirme silindi")
        }
        check(part.renameTo(model)) { "Model dosyası taşınamadı" }
        prefs.edit().putBoolean(SHA256, true).apply()
        model
    }

    private fun verify(file: File): Boolean {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().buffered(128 * 1024).use { stream ->
            val buf = ByteArray(128 * 1024)
            while (true) {
                val n = stream.read(buf)
                if (n < 0) break
                md.update(buf, 0, n)
            }
        }
        return md.digest().joinToString("") { "%02x".format(it) } == SHA256
    }
}
