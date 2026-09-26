/* Mock HSK 4 Test 1 — original questions in the official format & proportions (shortened to ~40% length).
   Real HSK 4: Listening 45q/~30min, Reading 40q/40min, Writing 15q/25min, score /300, pass 180.
   This test: Listening 15q, Reading 15q, Writing 8q — same section order, item types and scoring weight. */
window.CB_MOCK = window.CB_MOCK || [];
window.CB_MOCK.push({
  id: 1,
  title: "模拟测试 1 · Mock Test 1",
  listening: {
    time: 480,
    p1: [
      { id: "L1-1", audio: { text: "王明每天早上七点起床，然后去公司上班。周末他喜欢在家看书，不喜欢出去玩。", voice: "M" }, statement: "王明周末喜欢出去玩。", answer: false },
      { id: "L1-2", audio: { text: "这个周末天气很好，我们决定去公园散步，顺便拍一些照片。", voice: "F" }, statement: "他们周末打算去公园。", answer: true },
      { id: "L1-3", audio: { text: "我的新同事很热情，工作也很认真，大家都很喜欢跟她合作。", voice: "F" }, statement: "同事们都喜欢跟她合作。", answer: true },
      { id: "L1-4", audio: { text: "经理说这个月的工资会晚几天发，因为财务系统正在升级。", voice: "M" }, statement: "这个月工资会提前发。", answer: false },
      { id: "L1-5", audio: { text: "虽然那家餐厅很有名，但是服务员态度不太好，所以我们不会再去了。", voice: "F" }, statement: "那家餐厅的服务很好。", answer: false }
    ],
    p2: [
      { id: "L2-1", dialogue: [{ text: "你今天怎么这么晚才到公司？", voice: "M" }, { text: "路上堵车堵得很厉害，我在路上堵了半个小时。", voice: "F" }], question: "女的为什么迟到了？", options: ["她睡过头了", "路上堵车", "她生病了", "公司太远"], answer: 1 },
      { id: "L2-2", dialogue: [{ text: "请问，人力资源部在几楼？", voice: "F" }, { text: "在三楼，电梯口右边第一个办公室。", voice: "M" }], question: "人力资源部在哪里？", options: ["一楼", "二楼", "三楼", "四楼"], answer: 2 },
      { id: "L2-3", dialogue: [{ text: "你觉得这份合同还有什么问题吗？", voice: "F" }, { text: "薪资部分写得不太清楚，最好再确认一下。", voice: "M" }], question: "男的觉得合同哪里有问题？", options: ["日期", "薪资部分", "公司名字", "没有问题"], answer: 1 },
      { id: "L2-4", dialogue: [{ text: "明天的培训几点开始？", voice: "F" }, { text: "上午九点，最好八点五十到会议室。", voice: "M" }], question: "培训几点开始？", options: ["八点", "八点五十", "九点", "十点"], answer: 2 },
      { id: "L2-5", dialogue: [{ text: "你打算什么时候提交婚假申请？", voice: "M" }, { text: "我这周就交，下个月要回老家结婚。", voice: "F" }], question: "女的下个月要做什么？", options: ["出差", "结婚", "考试", "搬家"], answer: 1 }
    ],
    p3: [
      { id: "L3-1", audio: { text: "我们公司每年给员工提供一次免费体检，还有生日礼物和节日福利。这些福利让员工感觉公司很关心大家。", voice: "F" }, question: "这段话主要讲的是什么？", options: ["公司的产品", "公司的福利", "公司的历史", "员工的工资"], answer: 1 },
      { id: "L3-2", audio: { text: "小李本来打算辞职，但是经理跟她谈了以后，答应给她加薪，还调整了她的工作时间，所以她决定继续留下来。", voice: "M" }, question: "小李最后做了什么决定？", options: ["辞职", "继续留下来", "换部门", "出国"], answer: 1 },
      { id: "L3-3", audio: { text: "这次招聘会来了很多应聘者，人力资源部整整忙了一天，晚上才把简历都看完。", voice: "F" }, question: "人力资源部为什么忙了一整天？", options: ["开会", "整理仓库", "看应聘者的简历", "准备晚餐"], answer: 2 },
      { id: "L3-4", audio: { text: "公司决定从下个月开始，把上班时间从九点改成九点半，这样员工可以晚一点出门，避开早高峰。", voice: "M" }, question: "公司为什么改上班时间？", options: ["为了省钱", "为了避开早高峰", "为了加班", "为了开会"], answer: 1 },
      { id: "L3-5", audio: { text: "张经理说，虽然这个季度的任务完成得不错，但是明年的目标会更高，大家要继续努力。", voice: "M" }, question: "张经理对大家有什么要求？", options: ["放假休息", "继续努力", "换工作", "减少任务"], answer: 1 }
    ]
  },
  reading: {
    time: 720,
    p1: [
      { id: "R1-1", sentence: "他每天____去公司，从来不迟到。", options: ["按时", "突然", "随便", "马上"], answer: 0 },
      { id: "R1-2", sentence: "我____把这份报告写完，才能下班。", options: ["必须", "也许", "几乎", "差不多"], answer: 0 },
      { id: "R1-3", sentence: "公司的规定越来越严格，员工____遵守考勤制度。", options: ["忽然", "必须", "几乎", "曾经"], answer: 1 },
      { id: "R1-4", sentence: "他工作很____，从来没有出过错。", options: ["认真", "粗心", "懒惰", "随便"], answer: 0 },
      { id: "R1-5", sentence: "这次会议____要讨论明年的预算问题。", options: ["主要", "顺便", "偶尔", "马上"], answer: 0 }
    ],
    p2: [
      { id: "R2-1", sentence: "____他今天很忙，他还是抽时间参加了培训。", options: ["虽然", "因为", "如果", "只要"], answer: 0 },
      { id: "R2-2", sentence: "只要你把简历准备好，____可以马上申请这个职位。", options: ["所以", "就", "但是", "还"], answer: 1 },
      { id: "R2-3", sentence: "他不但工作认真，____对同事也很热情。", options: ["而且", "可是", "于是", "除了"], answer: 0 },
      { id: "R2-4", sentence: "由于系统升级，工资____要晚三天发放。", options: ["可能", "曾经", "刚才", "终于"], answer: 0 },
      { id: "R2-5", sentence: "除非经理同意，____我们不能改变这个计划。", options: ["否则", "因此", "而且", "虽然"], answer: 0 }
    ],
    p3: [
      { passage: "王芳大学毕业以后，进了一家外贸公司工作。她刚开始只是一名普通职员，但是因为工作认真，又愿意学习，两年后就被提升为部门经理。现在她不但要负责团队的日常工作，还要参加公司的重要会议。虽然压力比以前大了很多，但是她觉得这份工作让她学到了很多东西，也让她更加自信。",
        questions: [
          { id: "R3-1", q: "王芳大学毕业后做的第一份工作是什么？", options: ["部门经理", "普通职员", "公司老板", "老师"], answer: 1 },
          { id: "R3-2", q: "王芳为什么能被提升为部门经理？", options: ["因为她认识经理", "因为她工作认真、愿意学习", "因为她工作时间最长", "因为公司缺人"], answer: 1 },
          { id: "R3-3", q: "关于王芳，下列哪个是对的？", options: ["她觉得工作没有意义", "她的压力变小了", "她学到了很多东西", "她想辞职"], answer: 2 }
        ] },
      { passage: "很多公司现在都很重视员工的福利，比如免费的午餐、健身房，还有弹性工作时间。这样做不仅能让员工更满意，也能帮助公司留住优秀的人才。有调查显示，福利好的公司，员工离职率通常比较低。",
        questions: [
          { id: "R3-4", q: "公司重视员工福利的目的是什么？", options: ["减少工资", "留住优秀人才", "增加工作时间", "降低产品价格"], answer: 1 },
          { id: "R3-5", q: "根据这段话，福利好的公司通常怎么样？", options: ["员工离职率较低", "员工工资更低", "产品质量更好", "工作时间更长"], answer: 0 }
        ] }
    ]
  },
  writing: {
    time: 480,
    p1: [
      { id: "W1-1", tokens: ["听说", "我们", "下个月", "会", "加薪"], answer: "听说我们下个月会加薪", alt: ["我们听说下个月会加薪", "听说下个月我们会加薪"] },
      { id: "W1-2", tokens: ["经理", "同意", "了", "我的", "申请"], answer: "经理同意了我的申请" },
      { id: "W1-3", tokens: ["公司", "每年", "组织", "一次", "体检"], answer: "公司每年组织一次体检", alt: ["每年公司组织一次体检"] },
      { id: "W1-4", tokens: ["这份", "合同", "还", "没有", "签"], answer: "这份合同还没有签" },
      { id: "W1-5", tokens: ["他", "对", "这个", "结果", "很", "满意"], answer: "他对这个结果很满意" }
    ],
    p2: [
      { id: "W2-1", word: "加班", emoji: "🌙💻😩", sample: "他昨天加班到很晚，很累。" },
      { id: "W2-2", word: "合同", emoji: "📄✍️🤝", sample: "他们已经签好合同了。" },
      { id: "W2-3", word: "福利", emoji: "🎁🏥🍱", sample: "这家公司的福利很好。" }
    ]
  }
});
