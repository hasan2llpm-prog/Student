package com.student.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.student.core.data.PostItem

/** Community video player that starts only after a tap to avoid wasting data in scrolling feeds. */
@Composable
internal fun CommunityVideoPlayer(post: PostItem, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val network = remember { communityNetworkProfile(context) }
    var started by remember(post.id) { mutableStateOf(false) }
    var activeUrl by remember(post.id, network.constrained) {
        mutableStateOf(if (network.constrained) post.mediaLowUrl ?: post.mediaUrl else post.mediaUrl ?: post.mediaLowUrl)
    }
    val fallbackUrl = remember(post.id, activeUrl) {
        listOfNotNull(post.mediaLowUrl, post.mediaUrl).distinct().firstOrNull { it != activeUrl }
    }

    if (!started) {
        Surface(
            modifier = modifier.fillMaxWidth().heightIn(min = 210.dp, max = 520.dp).clickable { started = true },
            color = Color.Black
        ) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.PlayCircle, "تشغيل الفيديو", tint = Color.White, modifier = Modifier.fillMaxSize(.20f))
            }
        }
        return
    }

    val player = remember(post.id) {
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(StudentMediaPlayback.mediaSourceFactory(context))
            .build()
            .apply { playWhenReady = false }
    }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                val fallback = fallbackUrl ?: return
                if (fallback == activeUrl) return
                activeUrl = fallback
            }
        }
        player.addListener(listener)
        onDispose {
            player.removeListener(listener)
            player.release()
        }
    }

    LaunchedEffect(activeUrl, player) {
        val url = activeUrl ?: return@LaunchedEffect
        player.setMediaItem(MediaItem.fromUri(url))
        player.prepare()
    }

    AndroidView(
        factory = { ctx -> PlayerView(ctx).apply { this.player = player; useController = true } },
        update = { it.player = player },
        modifier = modifier.fillMaxWidth().heightIn(min = 240.dp, max = 620.dp)
    )
}
