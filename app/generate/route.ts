import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  try {
    // 1. 【第一处修改】在参数解构这里，加入前端传来的新变量
    const { 
      title, 
      engineId, 
      engineTitle, 
      productInfo, 
      mode, 
      originalContent, // 前端传来的初步方案原文
      targetPlatform  // 目标平台：xiaohongshu 或 douyin
    } = await req.json();

    // 2. 【第二处修改】插入判断逻辑：如果是转化请求，走专门的文案专家模型
    if (targetPlatform) {
      const isXHS = targetPlatform === 'xiaohongshu';
      
      const CONVERT_PROMPT = `
# Role
你是一名精通网感的爆款文案专家。现在，请基于“原始方案”的社会学洞察，进行${isXHS ? '小红书种草笔记' : '抖音爆款脚本'}的二次创作。

# Context
- 原始方案：${originalContent}
- 热搜背景：${title}
- 目标产品：${productInfo?.name}

# 创作要求
${isXHS ? `
- 风格：亲切活泼，多用 Emoji，像真人博主分享。
- 结构：爆款标题 + 分点正文（带情绪价值）+ 5-8个热门话题标签。
- 灵魂：必须保留原始方案中关于“${engineTitle || '社会学'}”的深刻切入点，不要写成普通广告。
` : `
- 风格：节奏感强，金句频出，有画面感。
- 结构：包含【分镜画面描述】和【口播台词】（带节奏感、洗脑）。
- 灵魂：用视频逻辑表现原始方案的深度。
`}

# 输出格式
必须以 JSON 格式输出，内容放在 "ideas" 数组中（为了兼容前端解析）：
{
  "ideas": [
    {
      "切入点": "${isXHS ? '笔记标题' : '视频核心主题'}",
      "文案": "${isXHS ? '小红书正文内容' : '脚本口播稿'}",
      "简述": "${isXHS ? '互动建议与标签' : '分镜与拍摄细节'}"
    }
  ]
}
`;

      const conversion = await openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [{ role: "system", content: CONVERT_PROMPT }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      return NextResponse.json(JSON.parse(conversion.choices[0].message.content || '{}'));
    }

    // 3. 【以下是你原封不动的原有逻辑】
    const SYSTEM_PROMPT = `
# Role
你是一名顶级商业策划总监，擅长解构宏大叙事并重组为高商业价值的营销策略。

# Workflow
1. 解构本质：剥离新闻的宏观外壳，提取核心要素（如：安全感、稀缺性、优越感）。
2. 逻辑平移：将要素无缝平移至具体商业场景。
3. 策略降维：将深层洞察包装成人类直觉能理解的短句。

# Logic Dictionary: 6大引擎深度逻辑
- [emotion] 情绪平替：挖掘个体避风港。文案要像深夜里的心声，提供心理代偿。
- [knowledge] 知识降维：拆解商业信号。让用户产生“原来钱是这么赚的”认知差。
- [reverse] 反向安利：做清醒的杠精。用反直觉逻辑制造视觉冲击。
- [lifestyle] 生活范式：将宏观政策转化为微观物权。讨论具体的居家、办公、恋爱场景。
- [insight] 底层逻辑：开启上帝视角。用社会学/商业本质逻辑穿透热搜。
- [collage] 暴力拼贴：执行随机碰撞。强行缝合新闻与[咖啡/美妆/数码/玄学]等赛道。

# Constraint
- 严禁出现“首先/其次/最后”、“总之”、“综上所述”、“对...有重要意义”。
- 拒绝形容词堆砌，多用动词和名词。
- 每一个点子必须包含：【切入点】、【文案】（极简）、【简述】（狠辣）。
- 必须以 JSON 格式输出。
`;

    const userPayload =
      mode === 'custom'
        ? `热搜标题：${title}
当前引擎：${engineTitle}（${engineId}）
产品信息：
- 名称：${productInfo?.name ?? ''}
- 类型：${productInfo?.type ?? ''}
- 目标人群：${productInfo?.audience ?? ''}
- 价格：${productInfo?.price ?? ''}
- 核心卖点：${productInfo?.features ?? ''}

请输出更“可落地”的定制方案，至少包含：
- ideas: 点子数组（每条包含【切入点】【文案】【简述】）
- plan: 执行清单（3-6条，短句）
- hooks: 3条开头钩子（短）
- ctas: 3条行动号召（短）
`
        : `热搜标题：${title}
当前引擎：${engineTitle}（${engineId}）

请输出“初步灵感”，保持简洁但要有冲击力。`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPayload }
      ],
      response_format: { type: 'json_object' }, 
      temperature: 0.85, 
    });
    
// --- 这里的逻辑改写，增加防爆解析 ---
const rawContent = completion.choices[0].message.content || '{}';
let responseData;

try {
  // 1. 尝试直接解析
  responseData = JSON.parse(rawContent);
} catch (e) {
  // 2. 如果解析失败，尝试去掉 AI 喜欢带的反引号 ```json ... ```
  const cleanedContent = rawContent
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  try {
    responseData = JSON.parse(cleanedContent);
  } catch (e2) {
    console.error("AI返回内容格式错误，无法解析:", rawContent);
    responseData = { error: "格式错误", raw: rawContent };
  }
}

return NextResponse.json(responseData);

  } catch (error) {
    console.error('DeepSeek Error:', error);
    return NextResponse.json({ error: '点子生成失败' }, { status: 500 });
  }
}