import { Agent, Building, TownEvent, TownAnalysis } from '../types/town';

export const INITIAL_BUILDINGS: Building[] = [
  {
    id: 'town_hall',
    name: '市政议事堂',
    category: 'civic',
    description: '小镇行政枢纽与公约商讨处，悬挂着小镇创建之初的铜钟。',
    x: 460,
    y: 100,
    width: 200,
    height: 140,
    color: '#334155',
    roofColor: '#1e293b',
    accentColor: '#38bdf8',
    icon: '🏛️',
    entranceX: 560,
    entranceY: 245
  },
  {
    id: 'library',
    name: '典籍档案馆',
    category: 'culture',
    description: '藏有数千卷星象图册、植物图谱与先民手记的静谧之地。',
    x: 160,
    y: 120,
    width: 180,
    height: 130,
    color: '#1e293b',
    roofColor: '#0f172a',
    accentColor: '#818cf8',
    icon: '📚',
    entranceX: 250,
    entranceY: 255
  },
  {
    id: 'cafe',
    name: '星光像素咖啡馆',
    category: 'leisure',
    description: '弥漫着现磨咖啡香气的社交温室，露天雨棚下总是坐满倾诉者。',
    x: 760,
    y: 120,
    width: 170,
    height: 130,
    color: '#292524',
    roofColor: '#1c1917',
    accentColor: '#f59e0b',
    icon: '☕',
    entranceX: 845,
    entranceY: 255
  },
  {
    id: 'bakery',
    name: '暖阳工坊烘焙房',
    category: 'commerce',
    description: '每天拂晓便传出麦香与肉桂气息，也是居民交换晨间八卦的据点。',
    x: 160,
    y: 390,
    width: 170,
    height: 130,
    color: '#44403c',
    roofColor: '#292524',
    accentColor: '#fb923c',
    icon: '🥐',
    entranceX: 245,
    entranceY: 525
  },
  {
    id: 'central_park',
    name: '晨曦喷泉绿地',
    category: 'nature',
    description: '小镇中心的大理石喷泉与花圃，落叶长椅是散步谈心的首选。',
    x: 440,
    y: 370,
    width: 240,
    height: 180,
    color: '#064e3b',
    roofColor: '#022c22',
    accentColor: '#34d399',
    icon: '⛲',
    entranceX: 560,
    entranceY: 460
  },
  {
    id: 'clinic',
    name: '康养诊所与草药堂',
    category: 'health',
    description: '窗明几净的医馆，窗台晒着薄荷与金银花，提供心理疏导与体检。',
    x: 760,
    y: 390,
    width: 170,
    height: 130,
    color: '#134e4a',
    roofColor: '#042f2e',
    accentColor: '#2dd4bf',
    icon: '🌿',
    entranceX: 845,
    entranceY: 525
  },
  {
    id: 'observatory',
    name: '观星台与精密工坊',
    category: 'culture',
    description: '架设有巨大铜制折射望远镜的塔楼，堆满了齿轮、透镜与星盘。',
    x: 180,
    y: 670,
    width: 180,
    height: 140,
    color: '#1e1b4b',
    roofColor: '#0f0e26',
    accentColor: '#a855f7',
    icon: '🔭',
    entranceX: 270,
    entranceY: 815
  },
  {
    id: 'cottages',
    name: '林荫木屋居住区',
    category: 'residential',
    description: '排列整齐的温馨原木小屋，屋顶烟囱飘着袅袅炊烟，提供甜美梦乡。',
    x: 720,
    y: 660,
    width: 220,
    height: 150,
    color: '#3f3f46',
    roofColor: '#27272a',
    accentColor: '#f43f5e',
    icon: '🏡',
    entranceX: 830,
    entranceY: 815
  }
];

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: '苏清禾',
    role: '星光咖啡店长兼调饮师',
    age: 28,
    gender: '女',
    spriteColor: '#f59e0b',
    mbti: 'ENFJ',
    bigFive: {
      openness: 78,
      conscientiousness: 82,
      extraversion: 90,
      agreeableness: 94,
      neuroticism: 32
    },
    bio: '心思细腻的咖啡馆主理人，擅长从客人的表情中调出最适合的心情特饮。喜欢在吧台倾听所有人的秘密，是小镇的情感联结枢纽。',
    quirks: ['记住全镇每个人的咖啡糖度', '下雨天会免费赠送自制燕麦饼', '对不爱惜书本的人很严格'],
    state: {
      energy: 88,
      mood: 75,
      stress: 20,
      sociability: 92
    },
    currentActivity: '手冲埃塞俄比亚咖啡并擦拭玻璃杯',
    currentThought: '陆学者今天不知道愿不愿意尝尝新调的肉桂拿铁？',
    currentBuildingId: 'cafe',
    x: 820,
    y: 230,
    targetX: 820,
    targetY: 230,
    speed: 1.2,
    direction: 'down',
    isMoving: false,
    affinity: {
      'agent-2': 35,
      'agent-3': 70,
      'agent-4': 45,
      'agent-5': 25,
      'agent-6': 15,
      'agent-7': 50
    },
    memories: [
      {
        id: 'mem-101',
        simDay: 1,
        simTime: '08:00',
        content: '清晨开店，阳光透过窗棂洒在咖啡机上，小镇的一天开始了。',
        importance: 4,
        sentiment: 'positive'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 70, stress: 22 },
      { simTime: '10:00', mood: 75, stress: 20 }
    ]
  },
  {
    id: 'agent-2',
    name: '陆行川',
    role: '档案馆学者与古籍修复师',
    age: 34,
    gender: '男',
    spriteColor: '#6366f1',
    mbti: 'INTJ',
    bigFive: {
      openness: 92,
      conscientiousness: 95,
      extraversion: 28,
      agreeableness: 58,
      neuroticism: 38
    },
    bio: '沉静典雅的文献学者，戴着金丝眼镜。醉心于先民星图与地方志的修复考证，极具逻辑感，但常常因为直言不讳显得有些孤高。',
    quirks: ['随身携带羽毛笔与放大镜', '讨厌任何人在阅览室大声喧哗', '对咖啡因有轻微依赖'],
    state: {
      energy: 76,
      mood: 52,
      stress: 40,
      sociability: 35
    },
    currentActivity: '研读十七世纪羊皮纸星象残卷',
    currentThought: '这份星历记录与顾工坊主的机械运转数据有微妙偏差...',
    currentBuildingId: 'library',
    x: 230,
    y: 220,
    targetX: 230,
    targetY: 220,
    speed: 1.1,
    direction: 'right',
    isMoving: false,
    affinity: {
      'agent-1': 35,
      'agent-3': 15,
      'agent-4': 40,
      'agent-5': 60,
      'agent-6': 20,
      'agent-7': -5
    },
    memories: [
      {
        id: 'mem-201',
        simDay: 1,
        simTime: '08:30',
        content: '在档案馆第三排书架发现了被遗忘的《群星引力志》。',
        importance: 8,
        sentiment: 'deep'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 50, stress: 42 },
      { simTime: '10:00', mood: 52, stress: 40 }
    ]
  },
  {
    id: 'agent-3',
    name: '林小满',
    role: '暖阳工坊烘焙师',
    age: 22,
    gender: '女',
    spriteColor: '#f97316',
    mbti: 'ESFP',
    bigFive: {
      openness: 72,
      conscientiousness: 60,
      extraversion: 88,
      agreeableness: 86,
      neuroticism: 25
    },
    bio: '小镇的快乐制造者，总是系着沾满面粉的围裙。坚信新鲜出炉的牛角包能治愈人间所有忧愁，热衷于开发各种奇思妙想的面包新品。',
    quirks: ['烤出满意的面包时会原地转圈', '喜欢给每个面包起搞怪名字', '对温度极其敏感'],
    state: {
      energy: 90,
      mood: 85,
      stress: 15,
      sociability: 85
    },
    currentActivity: '将发酵好的蜂蜜核桃软欧包送入烤箱',
    currentThought: '今天得多留两个流心包给散步路过的朋友们！',
    currentBuildingId: 'bakery',
    x: 230,
    y: 480,
    targetX: 230,
    targetY: 480,
    speed: 1.3,
    direction: 'left',
    isMoving: false,
    affinity: {
      'agent-1': 70,
      'agent-2': 15,
      'agent-4': 55,
      'agent-5': 40,
      'agent-6': 10,
      'agent-7': 65
    },
    memories: [
      {
        id: 'mem-301',
        simDay: 1,
        simTime: '06:30',
        content: '第一批法棍出炉，外脆里嫩，今天肯定是充实的一天！',
        importance: 5,
        sentiment: 'positive'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 80, stress: 18 },
      { simTime: '10:00', mood: 85, stress: 15 }
    ]
  },
  {
    id: 'agent-4',
    name: '周景明',
    role: '康养诊所医师兼草药师',
    age: 41,
    gender: '男',
    spriteColor: '#10b981',
    mbti: 'INFJ',
    bigFive: {
      openness: 84,
      conscientiousness: 88,
      extraversion: 46,
      agreeableness: 90,
      neuroticism: 22
    },
    bio: '平和慈祥的医者，擅长中西医与植物芳疗。除了看诊，最关心小镇居民的作息与心境平衡，常常在诊所后院栽种宁神薄荷。',
    quirks: ['习惯用药草香囊作为见面礼', '能一眼看穿别人是不是在熬夜', '说话语调永远不疾不徐'],
    state: {
      energy: 82,
      mood: 68,
      stress: 18,
      sociability: 60
    },
    currentActivity: '整理清晨采摘的新鲜洋甘菊与迷迭香',
    currentThought: '最近顾工坊主的眼圈似乎又深了，得提醒她安神。',
    currentBuildingId: 'clinic',
    x: 830,
    y: 480,
    targetX: 830,
    targetY: 480,
    speed: 1.1,
    direction: 'up',
    isMoving: false,
    affinity: {
      'agent-1': 45,
      'agent-2': 40,
      'agent-3': 55,
      'agent-5': 50,
      'agent-6': 40,
      'agent-7': 60
    },
    memories: [
      {
        id: 'mem-401',
        simDay: 1,
        simTime: '07:30',
        content: '配制了三瓶舒缓睡眠的薰衣草精油放置在诊所前台。',
        importance: 4,
        sentiment: 'positive'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 65, stress: 20 },
      { simTime: '10:00', mood: 68, stress: 18 }
    ]
  },
  {
    id: 'agent-5',
    name: '顾微澜',
    role: '观星台与精密工坊主',
    age: 29,
    gender: '女',
    spriteColor: '#a855f7',
    mbti: 'INTP',
    bigFive: {
      openness: 96,
      conscientiousness: 65,
      extraversion: 38,
      agreeableness: 62,
      neuroticism: 45
    },
    bio: '天马行空的机械发明狂热者，口袋里总装着扳手和黄铜齿轮。正在尝试打造一台能预测全镇微气候的“发条星盘机”。',
    quirks: ['兴奋时语速极快并比划手势', '头发上常常别着螺丝刀', '经常忘记吃饭时间'],
    state: {
      energy: 65,
      mood: 58,
      stress: 48,
      sociability: 45
    },
    currentActivity: '调试巨型发条星仪的第三号黄铜齿轮',
    currentThought: '只要调整这组擒纵机构，就能更精准观测星轨了！',
    currentBuildingId: 'observatory',
    x: 250,
    y: 760,
    targetX: 250,
    targetY: 760,
    speed: 1.25,
    direction: 'up',
    isMoving: false,
    affinity: {
      'agent-1': 25,
      'agent-2': 60,
      'agent-3': 40,
      'agent-4': 50,
      'agent-6': -10,
      'agent-7': 30
    },
    memories: [
      {
        id: 'mem-501',
        simDay: 1,
        simTime: '02:00',
        content: '深夜记录到了流星群的视差角，灵感大爆发！',
        importance: 9,
        sentiment: 'positive'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 55, stress: 50 },
      { simTime: '10:00', mood: 58, stress: 48 }
    ]
  },
  {
    id: 'agent-6',
    name: '陈默',
    role: '市政议事堂秘书长',
    age: 45,
    gender: '男',
    spriteColor: '#0284c7',
    mbti: 'ISTJ',
    bigFive: {
      openness: 45,
      conscientiousness: 98,
      extraversion: 40,
      agreeableness: 65,
      neuroticism: 30
    },
    bio: '严谨认真的公职管理者，小镇秩序的守护者。负责公共设施预算、治安巡查与议事会议程，对任何潜在隐患都抱有警惕。',
    quirks: ['文件夹永远按字母顺序分类', '准点按响市政厅钟声', '对公共支出精打细算'],
    state: {
      energy: 85,
      mood: 45,
      stress: 35,
      sociability: 50
    },
    currentActivity: '核对小镇下半年路灯煤油预算与修缮清单',
    currentThought: '观星台的用电负荷又超标了，得找顾微澜谈谈安全规约。',
    currentBuildingId: 'town_hall',
    x: 550,
    y: 200,
    targetX: 550,
    targetY: 200,
    speed: 1.1,
    direction: 'down',
    isMoving: false,
    affinity: {
      'agent-1': 15,
      'agent-2': 20,
      'agent-3': 10,
      'agent-4': 40,
      'agent-5': -10,
      'agent-7': -20
    },
    memories: [
      {
        id: 'mem-601',
        simDay: 1,
        simTime: '08:30',
        content: '向各工坊分发了本周安全生产自查通知单。',
        importance: 6,
        sentiment: 'neutral'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 42, stress: 38 },
      { simTime: '10:00', mood: 45, stress: 35 }
    ]
  },
  {
    id: 'agent-7',
    name: '姜寻',
    role: '游吟诗人与风景写生师',
    age: 25,
    gender: '男',
    spriteColor: '#ec4899',
    mbti: 'ISFP',
    bigFive: {
      openness: 94,
      conscientiousness: 40,
      extraversion: 55,
      agreeableness: 80,
      neuroticism: 52
    },
    bio: '四处流浪后选择在此定居的艺术家。一把鲁特琴、一个画夹，总是出现在喷泉边或树荫下捕捉风的痕迹与光影变幻。',
    quirks: ['对话常常带着押韵的歌词', '对鸽子情有独钟', '经常忘记带零钱'],
    state: {
      energy: 78,
      mood: 72,
      stress: 25,
      sociability: 70
    },
    currentActivity: '在中央喷泉旁的长椅上为两只白鸽画速写',
    currentThought: '今天阳光落在水面上的折射光晕，适合写进第三首叙事诗。',
    currentBuildingId: 'central_park',
    x: 530,
    y: 470,
    targetX: 530,
    targetY: 470,
    speed: 1.15,
    direction: 'right',
    isMoving: false,
    affinity: {
      'agent-1': 50,
      'agent-2': -5,
      'agent-3': 65,
      'agent-4': 60,
      'agent-5': 30,
      'agent-6': -20
    },
    memories: [
      {
        id: 'mem-701',
        simDay: 1,
        simTime: '09:00',
        content: '在喷泉边弹奏了新写的《晨露小夜曲》，听到微风回响。',
        importance: 6,
        sentiment: 'positive'
      }
    ],
    moodHistory: [
      { simTime: '08:00', mood: 68, stress: 28 },
      { simTime: '10:00', mood: 72, stress: 25 }
    ]
  }
];

export const INITIAL_EVENTS: TownEvent[] = [
  {
    id: 'event-init-1',
    title: '晨曦初照：小镇市集拂晓开集',
    description: '暖阳工坊的面包香气与星光咖啡的研磨声交织，居民们开始走出居所开启全新的一天。',
    type: 'social',
    impactSummary: '全镇居民整体心情上升，社交活跃度提升。',
    timestamp: Date.now() - 3600000,
    simTime: '08:00',
    active: false
  },
  {
    id: 'event-init-2',
    title: '星图残片现世传闻',
    description: '档案馆陆学者在古籍中疑似发现失落的星空坐标，引发了观星台与学者间的浓厚学术兴趣。',
    type: 'social',
    impactSummary: '陆行川与顾微澜互动概率大幅提升。',
    timestamp: Date.now() - 1800000,
    simTime: '09:30',
    active: true
  }
];

export const INITIAL_ANALYSIS: TownAnalysis = {
  id: 'analysis-init',
  title: 'Aetheria 小镇社区初期生态态势报告',
  summary: '小镇初期社会生态呈现出高度活跃且以生活美学、知识探求为导向的和谐网络。咖啡馆与面包坊构成了核心情感中转站，而市政秩序与学术自由之间的轻微边界探讨正在萌芽。',
  vibeScore: 68,
  emotionalVibe: '生机盎然、对未知充满善意好奇的温煦社区',
  coreConflicts: [
    {
      title: '工坊能耗与市政安全规约的诉求分歧',
      intensity: 38,
      agentsInvolved: ['陈默', '顾微澜'],
      description: '陈默出于小镇消防与预算考虑要求规范工坊用电，而顾微澜认为机械发条实验不应受到死板条例限制。'
    },
    {
      title: '严谨考据派与感性抒情派的审美摩擦',
      intensity: 25,
      agentsInvolved: ['陆行川', '姜寻'],
      description: '陆学者认为姜寻在喷泉边唱的歌词篡改了历史文献，姜寻则认为艺术源于浪漫而非索引。'
    }
  ],
  alliances: [
    {
      name: '晨光暖意生活圈',
      members: ['苏清禾', '林小满', '周景明'],
      cohesion: 88,
      theme: '关注邻里健康、心理疏导与美食治愈'
    },
    {
      name: '穹顶探秘学术同盟',
      members: ['陆行川', '顾微澜'],
      cohesion: 76,
      theme: '围绕失落古代天象与精密机械的共同求索'
    }
  ],
  recommendations: [
    '建议在中央喷泉举办“星光品鉴沙龙”，邀请陆学者与姜诗人共同创作小镇史诗',
    '由市政厅拨款为观星台设立专门的安全绝缘隔离区，兼顾安全与研究自由',
    '鼓励诊所与咖啡馆合作推出四季养生草本特饮，缓解居民压力'
  ],
  timestamp: Date.now() - 600000
};
