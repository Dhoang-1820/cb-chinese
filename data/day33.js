window.CB_DAYS = window.CB_DAYS || [];
window.CB_DAYS.push({
  day: 33,
  type: "lesson",
  title: { zh: "薪酬等级与带宽", vi: "Bậc lương & dải lương", en: "Pay grades & ranges" },

  words: [
    {
      id: "d33-01", hanzi: "档位", pinyin: "dàngwèi", pos: "n.", level: "Beyond HSK4",
      vi: "bậc (trong một ngạch lương)", en: "pay step; tier",
      collocations: [
        { zh: "薪酬档位", py: "xīnchóu dàngwèi", vi: "bậc lương", en: "pay step" },
        { zh: "升一个档位", py: "shēng yí gè dàngwèi", vi: "lên một bậc", en: "to move up one step" }
      ],
      example: {
        zh: "我们每个职级分成五个档位。",
        py: "Wǒmen měi gè zhíjí fēnchéng wǔ gè dàngwèi.",
        vi: "Mỗi ngạch của chúng tôi chia thành năm bậc.",
        en: "Each of our grades is divided into five steps."
      }
    },
    {
      id: "d33-02", hanzi: "带宽", pinyin: "dàikuān", pos: "n.", level: "Beyond HSK4",
      vi: "độ rộng dải lương", en: "range spread; pay range width",
      collocations: [
        { zh: "薪酬带宽", py: "xīnchóu dàikuān", vi: "độ rộng dải lương", en: "pay range spread" },
        { zh: "带宽太窄", py: "dàikuān tài zhǎi", vi: "dải lương quá hẹp", en: "the range is too narrow" }
      ],
      example: {
        zh: "这一级的带宽是百分之六十。",
        py: "Zhè yì jí de dàikuān shì bǎi fēn zhī liùshí.",
        vi: "Độ rộng dải lương của ngạch này là 60%.",
        en: "The range spread of this grade is 60%."
      },
      note: { vi: "Vốn là từ kỹ thuật (băng thông), trong C&B chỉ khoảng cách giữa mức sàn và mức trần của một ngạch.", en: "Originally a tech term (bandwidth); in C&B it means the gap between a grade's minimum and maximum." }
    },
    {
      id: "d33-03", hanzi: "中点值", pinyin: "zhōngdiǎnzhí", pos: "n.", level: "Beyond HSK4",
      vi: "mức giữa (của dải lương)", en: "midpoint",
      collocations: [
        { zh: "薪酬中点值", py: "xīnchóu zhōngdiǎnzhí", vi: "mức giữa dải lương", en: "range midpoint" },
        { zh: "低于中点值", py: "dīyú zhōngdiǎnzhí", vi: "thấp hơn mức giữa", en: "below midpoint" }
      ],
      example: {
        zh: "中点值一般参考市场第五十分位。",
        py: "Zhōngdiǎnzhí yìbān cānkǎo shìchǎng dì wǔshí fēnwèi.",
        vi: "Mức giữa thường tham chiếu phân vị 50 của thị trường.",
        en: "The midpoint usually follows the market 50th percentile."
      }
    },
    {
      id: "d33-04", hanzi: "下限", pinyin: "xiàxiàn", pos: "n.", level: "Beyond HSK4",
      vi: "mức sàn; giới hạn dưới", en: "minimum; lower limit",
      collocations: [
        { zh: "薪酬下限", py: "xīnchóu xiàxiàn", vi: "mức sàn của dải lương", en: "range minimum" },
        { zh: "低于下限", py: "dīyú xiàxiàn", vi: "thấp hơn mức sàn", en: "below the minimum" }
      ],
      example: {
        zh: "新员工的工资不能低于本级的下限。",
        py: "Xīn yuángōng de gōngzī bù néng dīyú běn jí de xiàxiàn.",
        vi: "Lương của nhân viên mới không được thấp hơn mức sàn của ngạch.",
        en: "A new hire's pay can't be below the minimum of their grade."
      }
    },
    {
      id: "d33-05", hanzi: "级差", pinyin: "jíchā", pos: "n.", level: "Beyond HSK4",
      vi: "chênh lệch giữa các ngạch/bậc", en: "grade differential",
      collocations: [
        { zh: "级差太小", py: "jíchā tài xiǎo", vi: "chênh lệch giữa các ngạch quá nhỏ", en: "differential too small" },
        { zh: "合理的级差", py: "hélǐ de jíchā", vi: "chênh lệch hợp lý", en: "a reasonable differential" }
      ],
      example: {
        zh: "相邻两级的级差大约是百分之十五。",
        py: "Xiānglín liǎng jí de jíchā dàyuē shì bǎi fēn zhī shíwǔ.",
        vi: "Chênh lệch giữa hai ngạch liền kề khoảng 15%.",
        en: "The differential between adjacent grades is about 15%."
      }
    },
    {
      id: "d33-06", hanzi: "重叠", pinyin: "chóngdié", pos: "v.", level: "Beyond HSK4",
      vi: "chồng lấn, trùng nhau", en: "to overlap",
      collocations: [
        { zh: "带宽重叠", py: "dàikuān chóngdié", vi: "dải lương chồng lấn", en: "range overlap" },
        { zh: "部分重叠", py: "bùfen chóngdié", vi: "chồng lấn một phần", en: "to partly overlap" }
      ],
      example: {
        zh: "相邻两个等级的工资可以部分重叠。",
        py: "Xiānglín liǎng gè děngjí de gōngzī kěyǐ bùfen chóngdié.",
        vi: "Lương của hai ngạch liền kề có thể chồng lấn một phần.",
        en: "Pay in two adjacent grades can partly overlap."
      }
    },
    {
      id: "d33-07", hanzi: "晋级", pinyin: "jìnjí", pos: "v.", level: "Beyond HSK4",
      vi: "lên ngạch, thăng bậc", en: "to move up a grade",
      collocations: [
        { zh: "晋级加薪", py: "jìnjí jiāxīn", vi: "lên ngạch tăng lương", en: "promotional increase" },
        { zh: "申请晋级", py: "shēnqǐng jìnjí", vi: "đề nghị lên ngạch", en: "to apply for a grade promotion" }
      ],
      example: {
        zh: "她今年晋级了，工资也涨了百分之十。",
        py: "Tā jīnnián jìnjí le, gōngzī yě zhǎngle bǎi fēn zhī shí.",
        vi: "Năm nay cô ấy được lên ngạch, lương cũng tăng 10%.",
        en: "She moved up a grade this year, and her pay rose 10%."
      }
    },
    {
      id: "d33-08", hanzi: "幅度", pinyin: "fúdù", pos: "n.", level: "Beyond HSK4",
      vi: "mức độ, biên độ (tăng/giảm)", en: "extent; range (of change)",
      collocations: [
        { zh: "调薪幅度", py: "tiáoxīn fúdù", vi: "mức điều chỉnh lương", en: "size of the pay increase" },
        { zh: "幅度不大", py: "fúdù bú dà", vi: "mức thay đổi không lớn", en: "not a big change" }
      ],
      example: {
        zh: "今年的调薪幅度平均是百分之七。",
        py: "Jīnnián de tiáoxīn fúdù píngjūn shì bǎi fēn zhī qī.",
        vi: "Mức tăng lương năm nay trung bình là 7%.",
        en: "This year's pay increases average 7%."
      }
    },
    {
      id: "d33-09", hanzi: "定级", pinyin: "dìngjí", pos: "v.", level: "Beyond HSK4",
      vi: "xếp ngạch, xếp bậc", en: "to assign a grade",
      collocations: [
        { zh: "入职定级", py: "rùzhí dìngjí", vi: "xếp ngạch khi vào làm", en: "grading at hire" },
        { zh: "重新定级", py: "chóngxīn dìngjí", vi: "xếp ngạch lại", en: "to regrade" }
      ],
      example: {
        zh: "新员工入职时，要根据经验定级。",
        py: "Xīn yuángōng rùzhí shí, yào gēnjù jīngyàn dìngjí.",
        vi: "Khi nhân viên mới vào làm, cần xếp ngạch dựa theo kinh nghiệm.",
        en: "New hires are graded according to their experience."
      }
    },
    {
      id: "d33-10", hanzi: "起薪", pinyin: "qǐxīn", pos: "n.", level: "Beyond HSK4",
      vi: "lương khởi điểm", en: "starting salary",
      collocations: [
        { zh: "起薪标准", py: "qǐxīn biāozhǔn", vi: "mức lương khởi điểm", en: "starting-pay standard" },
        { zh: "毕业生起薪", py: "bìyèshēng qǐxīn", vi: "lương khởi điểm của sinh viên mới ra trường", en: "graduate starting salary" }
      ],
      example: {
        zh: "大学毕业生的起薪大约是一千万越南盾。",
        py: "Dàxué bìyèshēng de qǐxīn dàyuē shì yìqiān wàn yuènándùn.",
        vi: "Lương khởi điểm của sinh viên đại học mới ra trường khoảng 10 triệu đồng.",
        en: "University graduates start at about 10 million VND."
      }
    }
  ],

  reading: {
    kind: "dialogue",
    title: { zh: "已经到最高档了", vi: "Đã lên bậc cao nhất rồi", en: "Already at the top step" },
    scene: {
      vi: "Trưởng xưởng Trương muốn tăng lương cho một công nhân giỏi. Hoàng Linh giải thích thang bảng lương, Lâm Hạo ngồi nghe.",
      en: "Workshop manager Zhang wants to give a strong worker a raise. Huang Ling explains the pay grade table while Lin Hao listens."
    },
    lines: [
      { speaker: "张经理", zh: "黄玲，我们车间的小阮做得很好，我想给他加薪。", py: "Huáng Líng, wǒmen chējiān de Xiǎo Ruǎn zuò de hěn hǎo, wǒ xiǎng gěi tā jiāxīn.", vi: "Hoàng Linh, cậu Nguyễn ở xưởng mình làm rất tốt, anh muốn tăng lương cho cậu ấy.", en: "Huang Ling, young Nguyen in my workshop is doing great. I want to give him a raise." },
      { speaker: "黄玲", zh: "我查一下。他是四级，现在已经在第五个档位了，也就是这一级的最高档。", py: "Wǒ chá yíxià. Tā shì sì jí, xiànzài yǐjīng zài dì wǔ gè dàngwèi le, yě jiù shì zhè yì jí de zuì gāo dàng.", vi: "Để em kiểm tra. Cậu ấy ở ngạch 4, hiện đã ở bậc 5 rồi, tức là bậc cao nhất của ngạch này.", en: "Let me check. He's grade 4 and already on step 5 — the top step of that grade." },
      { speaker: "张经理", zh: "那怎么办？不能再加了吗？", py: "Nà zěnme bàn? Bù néng zài jiā le ma?", vi: "Thế phải làm sao? Không tăng thêm được nữa à?", en: "So what now? Can't he get any more?" },
      { speaker: "黄玲", zh: "如果他的能力已经达到五级的要求，可以申请晋级。晋级以后按照五级重新定级。", py: "Rúguǒ tā de nénglì yǐjīng dádào wǔ jí de yāoqiú, kěyǐ shēnqǐng jìnjí. Jìnjí yǐhòu ànzhào wǔ jí chóngxīn dìngjí.", vi: "Nếu năng lực của cậu ấy đã đạt yêu cầu ngạch 5 thì có thể đề nghị lên ngạch. Lên ngạch xong sẽ xếp lại theo ngạch 5.", en: "If his skills already meet grade 5 requirements, you can apply for a grade promotion. He'll then be regraded under grade 5." },
      { speaker: "林浩", zh: "四级和五级的级差大吗？", py: "Sì jí hé wǔ jí de jíchā dà ma?", vi: "Chênh lệch giữa ngạch 4 và ngạch 5 có lớn không ạ?", en: "Is the differential between grades 4 and 5 big?" },
      { speaker: "黄玲", zh: "中点值差百分之十五左右。不过两级的带宽有一部分重叠，所以他的工资不会一下子涨很多。", py: "Zhōngdiǎnzhí chà bǎi fēn zhī shíwǔ zuǒyòu. Búguò liǎng jí de dàikuān yǒu yí bùfen chóngdié, suǒyǐ tā de gōngzī bú huì yíxiàzi zhǎng hěn duō.", vi: "Mức giữa chênh nhau khoảng 15%. Nhưng dải lương của hai ngạch chồng lấn một phần, nên lương cậu ấy sẽ không tăng vọt ngay.", en: "The midpoints differ by about 15%. But the two ranges partly overlap, so his pay won't jump a lot at once." },
      { speaker: "张经理", zh: "大概能涨多少？", py: "Dàgài néng zhǎng duōshao?", vi: "Khoảng tăng được bao nhiêu?", en: "Roughly how much could it go up?" },
      { speaker: "黄玲", zh: "晋级的加薪幅度一般是百分之八到百分之十二，至少要达到五级的下限。", py: "Jìnjí de jiāxīn fúdù yìbān shì bǎi fēn zhī bā dào bǎi fēn zhī shí'èr, zhìshǎo yào dádào wǔ jí de xiàxiàn.", vi: "Mức tăng khi lên ngạch thường từ 8% đến 12%, ít nhất phải đạt mức sàn của ngạch 5.", en: "A promotional increase is usually 8–12%, and at least up to the grade 5 minimum." },
      { speaker: "林浩", zh: "这样设计既能激励老员工，又不会让新员工的起薪太高。", py: "Zhèyàng shèjì jì néng jīlì lǎo yuángōng, yòu bú huì ràng xīn yuángōng de qǐxīn tài gāo.", vi: "Thiết kế như vậy vừa tạo động lực cho nhân viên lâu năm, vừa không làm lương khởi điểm của người mới quá cao.", en: "That design both motivates long-serving staff and keeps new hires' starting pay from getting too high." }
    ],
    notes: [
      { zh: "车间", py: "chējiān", vi: "xưởng sản xuất", en: "workshop (factory floor)" },
      { zh: "达到", py: "dádào", vi: "đạt tới", en: "to reach" },
      { zh: "至少", py: "zhìshǎo", vi: "ít nhất", en: "at least" }
    ]
  },

  grammar: {
    point: "既……又……", py: "jì…yòu…",
    meaning: { vi: "vừa… vừa…", en: "both … and …" },
    structure: "主语 + 既 + A（V / adj.），又 + B（V / adj.）",
    explain: {
      vi: "Nối hai đặc điểm hoặc hai hành động cùng tồn tại, trang trọng hơn 又…又…. 既 và 又 đứng sau chủ ngữ, trước động từ/tính từ. Hai vế thường có cấu trúc giống nhau.",
      en: "Links two qualities or actions that are both true; more formal than 又…又…. 既 and 又 come after the subject and before the verb/adjective. The two parts usually have parallel structure."
    },
    examples: [
      { zh: "好的薪酬等级既要公平，又要有竞争力。", py: "Hǎo de xīnchóu děngjí jì yào gōngpíng, yòu yào yǒu jìngzhēnglì.", vi: "Thang lương tốt vừa phải công bằng, vừa phải có tính cạnh tranh.", en: "A good grade structure must be both fair and competitive." },
      { zh: "宽带薪酬既灵活，又方便管理。", py: "Kuāndài xīnchóu jì línghuó, yòu fāngbiàn guǎnlǐ.", vi: "Lương dải rộng (broadbanding) vừa linh hoạt vừa dễ quản lý.", en: "Broadband pay is both flexible and easy to manage." },
      { zh: "他既有经验，又懂中文，所以定级比较高。", py: "Tā jì yǒu jīngyàn, yòu dǒng Zhōngwén, suǒyǐ dìngjí bǐjiào gāo.", vi: "Anh ấy vừa có kinh nghiệm vừa biết tiếng Trung, nên được xếp ngạch khá cao.", en: "He has experience and knows Chinese, so he was graded fairly high." }
    ]
  },

  exercises: {
    fill: [
      { zh: "我们每个职级分成五个___。", answer: "档位", vi: "Mỗi ngạch của chúng tôi chia thành năm bậc.", en: "Each of our grades is divided into five steps." },
      { zh: "新员工的工资不能低于本级的___。", answer: "下限", vi: "Lương của nhân viên mới không được thấp hơn mức sàn của ngạch.", en: "A new hire's pay can't be below the grade minimum." },
      { zh: "今年的调薪___平均是百分之七。", answer: "幅度", vi: "Mức tăng lương năm nay trung bình là 7%.", en: "This year's raises average 7%." },
      { zh: "相邻两个等级的工资可以部分___。", answer: "重叠", vi: "Lương của hai ngạch liền kề có thể chồng lấn một phần.", en: "Pay in two adjacent grades can partly overlap." },
      { zh: "大学毕业生的___大约是一千万越南盾。", answer: "起薪", vi: "Lương khởi điểm của sinh viên đại học mới ra trường khoảng 10 triệu đồng.", en: "University graduates start at about 10 million VND." }
    ],
    translate: [
      { vi: "Thang lương tốt vừa phải công bằng, vừa phải có tính cạnh tranh.", en: "A good grade structure must be both fair and competitive.", zh: "好的薪酬等级既要公平，又要有竞争力。", py: "Hǎo de xīnchóu děngjí jì yào gōngpíng, yòu yào yǒu jìngzhēnglì." },
      { vi: "Năm nay cô ấy được lên ngạch, lương cũng tăng 10%.", en: "She moved up a grade this year and her pay rose 10%.", zh: "她今年晋级了，工资也涨了百分之十。", py: "Tā jīnnián jìnjí le, gōngzī yě zhǎngle bǎi fēn zhī shí." },
      { vi: "Nhân viên mới được xếp ngạch dựa theo kinh nghiệm.", en: "New hires are graded according to experience.", zh: "新员工是根据经验定级的。", py: "Xīn yuángōng shì gēnjù jīngyàn dìngjí de." }
    ]
  },

  quiz: [
    { q: "“起薪”的意思是：", options: [{ vi: "Lương tháng 13", en: "13th-month pay" }, { vi: "Tiền làm thêm giờ", en: "Overtime pay" }, { vi: "Lương khởi điểm", en: "Starting salary" }, { vi: "Lương hưu", en: "Pension" }], answer: 2 },
    { q: "“重叠”的拼音是：", options: ["chóngdié", "zhòngdié", "chóngdiè", "chōngdié"], answer: 0 },
    { q: "好的薪酬等级___要公平，又要有竞争力。", options: ["不但", "既", "也", "还"], answer: 1, explain: { vi: "既…又…: vừa… vừa….", en: "既…又… = both … and …." } },
    { q: "“中点值”是：", options: [{ vi: "Mức sàn", en: "Minimum" }, { vi: "Mức trần", en: "Maximum" }, { vi: "Chênh lệch giữa các ngạch", en: "Grade differential" }, { vi: "Mức giữa của dải lương", en: "Range midpoint" }], answer: 3 },
    { q: "“晋级”的拼音是：", options: ["jìnjī", "jīnjí", "jìnjí", "jìnjǐ"], answer: 2 },
    { q: "今年的调薪___平均是百分之七。", options: ["档位", "幅度", "下限", "级差"], answer: 1, explain: { vi: "调薪幅度: mức tăng lương (bao nhiêu %).", en: "调薪幅度 = the size of the raise (in %)." } },
    { q: "“定级”的意思是：", options: [{ vi: "Xếp ngạch, xếp bậc", en: "To assign a grade" }, { vi: "Định giá sản phẩm", en: "To price a product" }, { vi: "Đặt lịch họp", en: "To schedule a meeting" }, { vi: "Hẹn giờ", en: "To set a timer" }], answer: 0 },
    { q: "根据对话，小阮现在在第几个档位？", options: ["第一个", "第三个", "第四个", "第五个"], answer: 3, explain: { vi: "黄玲 nói: 现在已经在第五个档位了。", en: "Huang Ling says: 现在已经在第五个档位了。" } },
    { q: "在薪酬管理中，“带宽”指的是：", options: [{ vi: "Tốc độ Internet", en: "Internet speed" }, { vi: "Chênh lệch giữa hai ngạch", en: "The gap between two grades" }, { vi: "Độ rộng của dải lương", en: "The width of a pay range" }, { vi: "Số bậc trong một ngạch", en: "Number of steps in a grade" }], answer: 2 },
    { q: "新员工的工资不能低于本级的___。", options: ["下限", "起薪", "重叠", "晋级"], answer: 0 }
  ]
});
