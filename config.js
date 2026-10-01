/*
 * ==================== 可修改内容总表 ====================
 * 不用改 game.js：可以直接改下方文字、主题色、七个角色、音效、动画速度、碰撞特效等。
 * 改完保存并刷新网页。此套七头像素材对应七级合成；扩展级数需同时增加本地头像素材。
 */
window.GAME_CONFIG = {
  // [网页文字] 页面标题、说明、按钮、提示语等都集中在这里。
  text: {
    title: '小猫家园', pageSuffix: '喵喵合成乐', subtitle: '放下小猫，收获一团软萌', eyebrow: '欢迎回到猫咪小窝', welcome: '让小猫咪们团团相遇',
    score: '本局鱼干', best: '最高鱼干', next: '下一只', restart: '重新开局', guideTitle: '猫咪成长手册',
    guide: '让两只相同的小猫咪碰在一起，它们就会合成更大、更萌的猫咪伙伴！',
    recordTitle: '猫窝小记录', current: '本局鱼干', personalBest: '最多鱼干', privacy: '🔒 记录只保存在这台设备，不联网、不上传。',
    tip: '小秘诀：轻轻调整投放位置，让相同花色的小猫靠在一起吧！',
    controls: '点击 / 轻触投放 · A D 或 ← → 移动 · 空格投放 · R 重开',
    hint: '移动鼠标 / 手指选择投放位置', canvasLabel: '游戏区域。点击或轻触投放，合并相同小猫。', footer: '一个安静的离线小游戏 · 没有广告，没有排行榜', offline: '离线也能玩',
    endEyebrow: '喵呜，玩得真棒', endTitle: '再陪小猫玩一局吗？', result: '本局鱼干', again: '🐾 再玩一次', install: '安装小猫家园',
    toastMerge: '喵呜！猫咪合体啦！', toastMax: '😻 猫咪家园大团圆！', toastBest: '喵！鱼干纪录刷新啦！', toastStart: '喵喵！新的一局开始啦！', specialCollision: '💫 开心奶猫与粉粉小猪：喵力共鸣！'
  },

  // [主题] 调整颜色即可更换整页观感；light / dark 会由顶部太阳按钮切换。
  theme: {
    page: '#fff3f3', ink: '#59434b', muted: '#a18a91', accent: '#dc829c', accentDark: '#b95f7a',
    board: '#fffaf7', boardBottom: '#f6e2df', line: '#f0dadd', card: '#fffdfc', highlight: '#f4bdc8',
    darkPage: '#30262d', darkInk: '#fff0f2', darkMuted: '#c9aeb7', darkBoard: '#493943', darkCard: '#3d3039'
  },

  // [游戏物品] 顺序决定七个头像的成长链；相同角色碰撞就会合成。radius 控制碰撞/显示大小，mascot 对应 assets/cat-1.png 至 cat-7.png。
  items: [
    { name: '蓝星小猫', emoji: '🐱', mascot: 0, color: '#9bcafa', points: 1, radius: 33 },
    { name: '蓝泡泡猫', emoji: '🐱', mascot: 1, color: '#92d5e8', points: 3, radius: 36 },
    { name: '暖棕熊猫', emoji: '🐻', mascot: 2, color: '#c57d4a', points: 6, radius: 39 },
    { name: '白云猫猫', emoji: '🐱', mascot: 3, color: '#fff8ed', points: 10, radius: 42 },
    { name: '星星兔兔', emoji: '🐰', mascot: 4, color: '#fff8fb', points: 15, radius: 45 },
    { name: '开心奶猫', emoji: '😺', mascot: 5, color: '#fff0d6', points: 22, radius: 48 },
    { name: '粉粉小猪', emoji: '🐷', mascot: 6, color: '#ffb8cf', points: 32, radius: 51 }
  ],

  // [玩法] 危险线从顶部计比例；调高该值会让危险线更靠近底边、可堆叠区更短，难度更高。
  play: { width: 420, height: 760, wallPadding: 12, dangerLine: 0.62, dangerSeconds: 1.6, dropDelay: 115, maxItemIndex: 4 },

  // [动画] 可调重力、碰撞弹性、表面摩擦、黏附、粒子数；specialPair 是相遇触发特效的角色序号 (从 0 开始)。
  animation: { gravity: 1620, bounce: 0.27, floorBounce: 0.22, wallBounce: 0.38, surfaceFriction: 0.86, adhesion: 300, stickyRange: 6, mergeScale: 1.2, mergeDuration: 180, shake: 5, particles: 12, particleLife: 650, stickerOutline: 3.2, specialPair: [5, 6], specialColor: '#8cecf2' },

  // [音效] Web Audio 合成音，无需下载音频文件；enabled 默认开启。
  sound: { enabled: true, volume: 0.12, dropHz: 320, mergeHz: 660, duration: 0.12, meowDuration: 0.34, meowPitch: 620 },
  // [离线词库] 游戏页末尾会优先用 word-bank.js 覆盖；此轻量内置词条确保挑战脚本加载失败时也可开局。
  vocabulary: window.WORD_BANK || [
    { word:'abandon', phonetic:'/əˈbændən/', meaning:'放弃；遗弃', example:'We should never abandon our dreams.', translation:'我们永远不应该放弃梦想。', forms:'abandoned · abandoning · abandonment' },
    { word:'benefit', phonetic:'/ˈbenɪfɪt/', meaning:'益处；受益；有利于', example:'Regular exercise benefits both body and mind.', translation:'规律锻炼对身心都有益。', forms:'benefited · benefiting · beneficial' },
    { word:'capacity', phonetic:'/kəˈpæsəti/', meaning:'能力；容量；职位', example:'The hall has a capacity of five hundred people.', translation:'这座大厅可容纳五百人。', forms:'capacities · capable · capability' },
    { word:'decline', phonetic:'/dɪˈklaɪn/', meaning:'下降；衰退；婉拒', example:'Sales began to decline after the holiday.', translation:'假期过后，销量开始下降。', forms:'declined · declining · decline (n.)' },
    { word:'emerge', phonetic:'/ɪˈmɜːdʒ/', meaning:'出现；浮现；显露', example:'A clear pattern emerged from the data.', translation:'数据中显现出一个清晰的规律。', forms:'emerged · emerging · emergence' },
    { word:'fundamental', phonetic:'/ˌfʌndəˈmentl/', meaning:'基本的；根本的；基础', example:'Trust is fundamental to a healthy friendship.', translation:'信任是健康友谊的基础。', forms:'fundamentally · fundamentals' },
    { word:'generate', phonetic:'/ˈdʒenəreɪt/', meaning:'产生；生成；引起', example:'The discussion generated several new ideas.', translation:'这次讨论产生了几个新想法。', forms:'generated · generating · generation' },
    { word:'highlight', phonetic:'/ˈhaɪlaɪt/', meaning:'强调；突出；最精彩的部分', example:'The report highlights the need for clean water.', translation:'报告强调了清洁用水的必要性。', forms:'highlighted · highlighting' },
    { word:'implement', phonetic:'/ˈɪmplɪment/', meaning:'实施；执行；工具', example:'The school will implement the new policy in June.', translation:'学校将在六月实施新政策。', forms:'implemented · implementing · implementation' },
    { word:'maintain', phonetic:'/meɪnˈteɪn/', meaning:'维持；保养；坚持认为', example:'It is important to maintain a healthy balance.', translation:'保持健康的平衡很重要。', forms:'maintained · maintaining · maintenance' },
    { word:'obtain', phonetic:'/əbˈteɪn/', meaning:'获得；取得；买到', example:'You can obtain further details from the library.', translation:'你可以从图书馆获取更多信息。', forms:'obtained · obtaining · obtainable' },
    { word:'perspective', phonetic:'/pəˈspektɪv/', meaning:'观点；角度；透视法', example:'Travel gave her a new perspective on daily life.', translation:'旅行让她对日常生活有了新的看法。', forms:'perspectives · perspectival' },
    { word:'significant', phonetic:'/sɪɡˈnɪfɪkənt/', meaning:'重要的；显著的；有意义的', example:'The team made significant progress in one week.', translation:'团队在一周内取得了显著进展。', forms:'significantly · significance' },
    { word:'transform', phonetic:'/trænsˈfɔːm/', meaning:'改变；使改观；变换', example:'A little kindness can transform someone’s day.', translation:'一点善意就能改变一个人的一天。', forms:'transformed · transforming · transformation' },
    { word:'valid', phonetic:'/ˈvælɪd/', meaning:'有效的；合理的；有根据的', example:'Your ticket is valid for three days.', translation:'你的票三天内有效。', forms:'validly · validity · invalidate' },
    { word:'widely', phonetic:'/ˈwaɪdli/', meaning:'广泛地；普遍地', example:'The idea is widely accepted by researchers.', translation:'研究人员普遍接受这个观点。', forms:'wide · width · widen' }
  ]
};
