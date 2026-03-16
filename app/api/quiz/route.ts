import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function generateMockQuiz(content: string) {
  const words = content.split(/\s+/).slice(0, 20).join(' ')
  return {
    questions: [
      {
        question: `다음 중 본문의 내용과 일치하는 것은? ("${words}...")`,
        options: ['본문에서 설명한 핵심 개념이다', '본문과 관련 없는 내용이다', '본문에서 부정한 내용이다', '본문에서 언급되지 않았다'],
        correctIndex: 0,
        explanation: '본문의 핵심 내용을 잘 파악하는 것이 중요합니다.',
      },
      {
        question: '이 자료의 주요 목적은 무엇인가?',
        options: ['개념 설명', '문제 제기', '비교 분석', '실험 결과 보고'],
        correctIndex: 0,
        explanation: '자료의 전체적인 흐름을 파악해보세요.',
      },
      {
        question: '본문을 올바르게 이해한 사람은?',
        options: ['핵심 내용을 정확히 파악한 학생', '세부 내용만 암기한 학생', '다른 주제와 혼동한 학생', '본문을 읽지 않은 학생'],
        correctIndex: 0,
        explanation: '핵심과 세부 내용을 균형있게 이해하는 것이 중요합니다.',
      },
      {
        question: '이 내용을 공부한 후 할 수 있는 것은?',
        options: ['관련 개념을 설명할 수 있다', '전혀 다른 분야에 적용할 수 있다', '더 이상 공부할 필요가 없다', '본문의 내용이 틀렸다고 주장할 수 있다'],
        correctIndex: 0,
        explanation: '학습의 목표는 개념을 이해하고 설명할 수 있는 것입니다.',
      },
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: '내용이 필요합니다' }, { status: 400 })
    }

    // If no API key, return mock quiz for local development
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(generateMockQuiz(content))
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
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
