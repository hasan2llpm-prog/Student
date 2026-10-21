package com.student.feature.home

import android.content.Context
import org.json.JSONArray

/**
 * Offline fallback for the user-provided Oxford 3000 + Oxford 5000 additional lists.
 * Supabase remains the preferred remote source; this asset guarantees that Beta
 * never opens an empty vocabulary section when the network is unavailable.
 */
internal fun loadOxford5000Vocabulary(context: Context): List<EnglishWord> = runCatching {
    val raw = context.assets.open("oxford_5000_ar.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
    val arr = JSONArray(raw)
    buildList(arr.length()) {
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            add(
                EnglishWord(
                    id = "ox_${o.getInt("rank").toString().padStart(4, '0')}",
                    word = o.getString("word"),
                    meaningAr = o.getString("meaning_ar"),
                    level = o.getString("level"),
                    example = "",
                    exampleAr = "",
                    partOfSpeech = o.optString("part_of_speech"),
                    category = o.optString("category")
                )
            )
        }
    }
}.getOrDefault(emptyList())

internal fun EnglishWord.primaryVocabularyCategory(): String =
    category.substringBefore('/').ifBlank {
        when {
            Regex("(^|\\s)n\\.").containsMatchIn(partOfSpeech) -> "noun"
            Regex("(^|\\s)adj\\.").containsMatchIn(partOfSpeech) -> "adjective"
            Regex("(^|\\s)adv\\.").containsMatchIn(partOfSpeech) -> "adverb"
            Regex("(^|\\s)v\\.").containsMatchIn(partOfSpeech) -> "verb"
            Regex("(^|\\s)prep\\.").containsMatchIn(partOfSpeech) -> "preposition"
            Regex("(^|\\s)conj\\.").containsMatchIn(partOfSpeech) -> "conjunction"
            else -> "other"
        }
    }


internal fun vocabularyCategoryEnglish(category: String): String = when (category.substringBefore('/')) {
    "noun" -> "Noun"
    "verb" -> "Verb"
    "adjective" -> "Adjective"
    "adverb" -> "Adverb"
    "preposition" -> "Preposition"
    "conjunction" -> "Conjunction"
    "pronoun" -> "Pronoun"
    "determiner" -> "Determiner"
    "modal" -> "Modal verb"
    "auxiliary" -> "Auxiliary verb"
    "number" -> "Number"
    "article" -> "Article"
    "exclamation" -> "Expression"
    else -> "Other"
}

internal fun vocabularyCategoryArabic(category: String): String = when (category.substringBefore('/')) {
    "noun" -> "اسم"
    "verb" -> "فعل"
    "adjective" -> "صفة"
    "adverb" -> "ظرف"
    "preposition" -> "حرف جر"
    "conjunction" -> "أداة ربط"
    "pronoun" -> "ضمير"
    "determiner" -> "محدد"
    "modal" -> "فعل ناقص"
    "auxiliary" -> "فعل مساعد"
    "number" -> "عدد"
    "article" -> "أداة"
    "exclamation" -> "تعبير"
    else -> "أخرى"
}
