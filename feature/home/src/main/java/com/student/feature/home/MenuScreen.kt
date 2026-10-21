package com.student.feature.home

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.student.core.data.StudentProfile

@Composable
fun MenuScreen(
    profile: StudentProfile?,
    onProfile: () -> Unit,
    onMessages: () -> Unit,
    onEducation: () -> Unit,
    onStudentAi: () -> Unit,
    onLearnEnglish: () -> Unit,
    onTeacherPortal: () -> Unit,
    onSuggestions: () -> Unit,
    onCommunity: () -> Unit,
    onActivity: () -> Unit,
    onStore: () -> Unit,
    onSaved: () -> Unit,
    onNotifications: () -> Unit,
    onAdmin: () -> Unit,
    onSettings: () -> Unit,
    onLogout: () -> Unit
) {
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(9.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth().clickable(onClick = onProfile),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, Color(0xFFE9E2F3))
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    StudentAvatar(profile?.fullName ?: "Student", profile?.avatarUrl, profile?.profileFrameUrl, 58.dp)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        StudentName(profile?.fullName ?: "مستخدم", profile?.isVerified == true, profile?.verificationColor, style = MaterialTheme.typography.titleLarge)
                        Text("@${profile?.username ?: "student"}", color = StudentMuted, fontSize = 12.sp)
                        if (!profile?.customBadgeLabel.isNullOrBlank()) {
                            Spacer(Modifier.height(4.dp)); CustomProfileBadge(profile?.customBadgeLabel, profile?.customBadgeColor)
                        }
                        Text("الملف الشخصي", color = StudentBlue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Icon(Icons.Rounded.ChevronRight, null, tint = StudentMuted)
                }
            }
        }
        item { MenuEntry(Icons.Rounded.School, "التعليم", onEducation) }
        item { MenuEntry(Icons.Rounded.Badge, "نظام المدرس", onTeacherPortal) }
        item { MenuEntry(Icons.Rounded.Storefront, "المتجر والمحفظة", onStore) }
        item { MenuEntry(Icons.Rounded.Bookmark, "المحفوظات", onSaved) }
        item { MenuEntry(Icons.Rounded.Notifications, "الإشعارات", onNotifications) }
        item { MenuEntry(Icons.Rounded.Groups, "المجتمع", onCommunity) }
        item { MenuEntry(Icons.Rounded.Bolt, "مركز النشاط", onActivity) }
        item { MenuEntry(Icons.Rounded.GroupAdd, "اقتراحات المتابعة", onSuggestions) }
        if (profile?.role.equals("admin", true)) item { MenuEntry(Icons.Rounded.AdminPanelSettings, "لوحة الأدمن", onAdmin) }
        item { MenuEntry(Icons.Rounded.Settings, "الإعدادات", onSettings) }
        item {
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(15.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFC62828)),
                border = BorderStroke(1.dp, Color(0xFFF0B9BE))
            ) { Icon(Icons.Rounded.Logout, null); Spacer(Modifier.width(6.dp)); Text("تسجيل الخروج", fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun MenuEntry(icon: ImageVector, title: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Color(0xFFE9E2F3))
    ) {
        Row(
            Modifier.fillMaxWidth().heightIn(min = 62.dp).padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, null, tint = StudentBlue)
            Text(title, style = MaterialTheme.typography.titleMedium, color = StudentText, modifier = Modifier.weight(1f))
            Icon(Icons.Rounded.ChevronRight, null, tint = Color(0xFF9AA3AF))
        }
    }
}
