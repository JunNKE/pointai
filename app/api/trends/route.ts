import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.TIAN_API_KEY;
  const url = `https://apis.tianapi.com/networkhot/index?key=${key}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.code !== 200) {
      console.error("❌ 天行API报错:", data.msg);
      return NextResponse.json({ error: data.msg }, { status: 400 });
    }

    // 方案 A：由于 API 没给平台名，我们定义一个列表循环分配
    const platformList = ['微博', '知乎', '抖音', '百度', '小红书'];

    const formattedTrends = data.result.list.map((item: any, index: number) => {
      // 根据索引循环取平台，比如第 1 条是微博，第 2 条是知乎...
      const assignedPlatform = platformList[index % platformList.length];

      return {
        id: `hot-${index}`,
        title: item.title,
        // 如果 API 有热度用 API 的，没有就生成一个递减的伪数据
        hot: item.hotnum && item.hotnum !== 0 ? Number(item.hotnum) : (100000 - index * 1000),
        platform: assignedPlatform, 
        trend: index % 3 === 0 ? 'up' : 'down' // 随机给一点趋势变化
      };
    });

    console.log("✅ 成功分配平台数据，发送至前端");
    return NextResponse.json(formattedTrends);
  } catch (e) {
    console.error("❌ 后端请求异常:", e);
    return NextResponse.json({ error: '网络连接失败' }, { status: 500 });
  }
}