package com.student.feature.home

import android.content.Context
import org.json.JSONArray


data class GrammarExample(
    val en: String,
    val ar: String
)

data class GrammarLesson(
    val id: String,
    val topicKey: String,
    val titleEn: String,
    val titleAr: String,
    val lessonTitleEn: String,
    val lessonTitleAr: String,
    val level: String,
    val explanationEn: String,
    val explanationAr: String,
    val form: String,
    val uses: List<String>,
    val examples: List<GrammarExample>,
    val commonMistakes: List<String>,
    val question: String,
    val options: List<String>,
    val correctIndex: Int,
    val keywords: List<String>
)

fun loadGrammar300(context: Context): List<GrammarLesson> = runCatching {
    val raw = context.assets.open("grammar_300_bilingual.json").bufferedReader(Charsets.UTF_8).use { it.readText() }
    val arr = JSONArray(raw)
    buildList(arr.length()) {
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val usesArr = o.optJSONArray("uses") ?: JSONArray()
            val useRows = buildList { for (j in 0 until usesArr.length()) add(usesArr.optString(j)) }
            val exArr = o.optJSONArray("examples") ?: JSONArray()
            val examples = buildList {
                for (j in 0 until exArr.length()) {
                    val e = exArr.getJSONObject(j)
                    add(GrammarExample(e.optString("en"), e.optString("ar")))
                }
            }
            val mistakesArr = o.optJSONArray("commonMistakes") ?: JSONArray()
            val mistakes = buildList { for (j in 0 until mistakesArr.length()) add(mistakesArr.optString(j)) }
            val optionsArr = o.optJSONArray("options") ?: JSONArray()
            val options = buildList { for (j in 0 until optionsArr.length()) add(optionsArr.optString(j)) }
            val keywordsArr = o.optJSONArray("keywords") ?: JSONArray()
            val keywords = buildList { for (j in 0 until keywordsArr.length()) add(keywordsArr.optString(j)) }
            add(
                GrammarLesson(
                    id = o.optString("id"),
                    topicKey = o.optString("topicKey"),
                    titleEn = o.optString("titleEn"),
                    titleAr = o.optString("titleAr"),
                    lessonTitleEn = o.optString("lessonTitleEn"),
                    lessonTitleAr = o.optString("lessonTitleAr"),
                    level = o.optString("level", "A1"),
                    explanationEn = o.optString("explanationEn"),
                    explanationAr = o.optString("explanationAr"),
                    form = o.optString("form"),
                    uses = useRows,
                    examples = examples,
                    commonMistakes = mistakes,
                    question = o.optString("question"),
                    options = options,
                    correctIndex = o.optInt("correctIndex", 0),
                    keywords = keywords
                )
            )
        }
    }
}.getOrDefault(emptyList())
