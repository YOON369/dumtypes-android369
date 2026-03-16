import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: '내용이 필요합니다' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1200,
      messages: [
        {
          role: 'user',
          content: `다음 텍스트를 읽고 4개의 객관식 문제를 만들어주세요.
텍스트가 영어면 한국어로 번역해서 문제를 만들어주세요.
문제는 텍스트 내용을 이해했는지 확인하는 내용이어야 합니다.

텍스트:
${content.slice(0, 2000)}

반드시 아래 JSON 형식만 응답하세요 (다른 텍스트 없이):
{
  "questions": [
    {
      "question": "문제 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correctIndex": 0,
      "explanation": "정답 설명 (1-2문장)"
    }
  ]
}`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: '퀴즈 생성 실패' }, { status: 500 })
    }

    const quiz = JSON.parse(jsonMatch[0])
    return NextResponse.json(quiz)
  } catch (err) {
    console.error('Quiz generation error:', err)
    return NextResponse.json({ error: '퀴즈 생성 중 오류가 발생했습니다' }, { status: 500 })
  }
}
