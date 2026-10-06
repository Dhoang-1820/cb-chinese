window.CB_TRACK = window.CB_TRACK || [];
window.CB_TRACK.push(
{
  week: 1, block: "templates",
  title: { zh: "工资发放通知", vi: "Thông báo chi trả lương", en: "Payroll notice" },
  goal: { vi: "Viết được thông báo lương hằng tháng: ngày chi trả, phiếu lương, khấu trừ và cách hỏi lại.", en: "Write a monthly payroll notice: pay date, pay slip, deductions and how to ask questions." },
  sessions: [
    {
      kind: "model",
      title: { zh: "范文：本月工资发放通知", vi: "Mẫu: thông báo lương tháng này", en: "Model: this month's payroll notice" },
      scenario: { vi: "Chị Hoàng Linh (nhân sự) gửi email thông báo ngày trả lương tháng 9 cho toàn công ty.", en: "Huang Ling (HR) emails the whole company the September pay date." },
      text: [
        { zh: "各位同事：", py: "Gèwèi tóngshì:", vi: "Kính gửi các đồng nghiệp:", en: "Dear colleagues," },
        { zh: "本月工资将于10月10日发放，请大家注意查收。", py: "Běn yuè gōngzī jiāng yú shí yuè shí rì fāfàng, qǐng dàjiā zhùyì cháshōu.", vi: "Lương tháng này sẽ được chi trả vào ngày 10/10, mong mọi người chú ý kiểm tra nhận lương.", en: "This month's salary will be paid on October 10. Please check that you have received it." },
        { zh: "工资条已发送至各位的公司邮箱，请核对工资明细。", py: "Gōngzītiáo yǐ fāsòng zhì gèwèi de gōngsī yóuxiāng, qǐng héduì gōngzī míngxì.", vi: "Phiếu lương đã được gửi tới email công ty của từng người, xin đối chiếu chi tiết lương.", en: "Your pay slip has been sent to your company email. Please check the pay details." },
        { zh: "如对金额有疑问，请在10月12日前联系人事部。", py: "Rú duì jīn'é yǒu yíwèn, qǐng zài shí yuè shí'èr rì qián liánxì rénshìbù.", vi: "Nếu có thắc mắc về số tiền, xin liên hệ phòng Nhân sự trước ngày 12/10.", en: "If you have questions about the amount, please contact HR before October 12." },
        { zh: "本月工资已扣除社会保险和个人所得税。", py: "Běn yuè gōngzī yǐ kòuchú shèhuì bǎoxiǎn hé gèrén suǒdéshuì.", vi: "Lương tháng này đã được khấu trừ bảo hiểm xã hội và thuế thu nhập cá nhân.", en: "Social insurance and personal income tax have been deducted from this month's pay." },
        { zh: "加班费和绩效奖金将与下月工资一并发放。", py: "Jiābānfèi hé jìxiào jiǎngjīn jiāng yǔ xià yuè gōngzī yībìng fāfàng.", vi: "Tiền làm thêm giờ và thưởng hiệu suất sẽ được chi trả cùng lương tháng sau.", en: "Overtime pay and performance bonuses will be paid together with next month's salary." },
        { zh: "感谢大家的配合。", py: "Gǎnxiè dàjiā de pèihé.", vi: "Cảm ơn sự phối hợp của mọi người.", en: "Thank you for your cooperation." },
        { zh: "人事部 黄玲", py: "Rénshìbù Huáng Líng", vi: "Phòng Nhân sự, Hoàng Linh", en: "HR Department, Huang Ling" }
      ],
      phrases: [
        { zh: "将于……发放", py: "jiāng yú ... fāfàng", vi: "sẽ được chi trả vào ...", en: "will be paid on ..." },
        { zh: "请注意查收", py: "qǐng zhùyì cháshōu", vi: "xin chú ý kiểm tra và nhận", en: "please check and collect (receipt)" },
        { zh: "请核对……", py: "qǐng héduì ...", vi: "xin đối chiếu ...", en: "please check/verify ..." },
        { zh: "如有疑问，请……", py: "rú yǒu yíwèn, qǐng ...", vi: "nếu có thắc mắc, xin ...", en: "if you have questions, please ..." },
        { zh: "已扣除……", py: "yǐ kòuchú ...", vi: "đã khấu trừ ...", en: "... has been deducted" },
        { zh: "与……一并发放", py: "yǔ ... yībìng fāfàng", vi: "chi trả cùng với ...", en: "paid together with ..." }
      ]
    },
    {
      kind: "fill",
      items: [
        { zh: "本月工资将___10月10日发放。", answer: "于", options: ["于", "把", "被", "比"], vi: "Lương tháng này sẽ được chi trả vào ngày 10/10.", en: "This month's salary will be paid on October 10." },
        { zh: "请大家注意___邮箱里的工资条。", answer: "查收", options: ["查收", "扣除", "发放", "加班"], vi: "Mọi người chú ý kiểm tra phiếu lương trong email.", en: "Everyone, please check the pay slip in your mailbox." },
        { zh: "请___工资明细是否正确。", answer: "核对", options: ["核对", "扣除", "发放", "配合"], vi: "Xin đối chiếu xem chi tiết lương có đúng không.", en: "Please check whether the pay details are correct." },
        { zh: "如有___，请联系人事部。", answer: "疑问", options: ["疑问", "发放", "扣除", "奖金"], vi: "Nếu có thắc mắc, xin liên hệ phòng Nhân sự.", en: "If you have questions, please contact HR." },
        { zh: "工资里已经___了社会保险和个人所得税。", answer: "扣除", options: ["扣除", "发放", "核对", "查收"], vi: "Trong lương đã khấu trừ bảo hiểm xã hội và thuế thu nhập cá nhân.", en: "Social insurance and personal income tax have already been deducted from the pay." },
        { zh: "加班费将与下月工资一并___。", answer: "发放", options: ["发放", "核对", "疑问", "配合"], vi: "Tiền làm thêm giờ sẽ được chi trả cùng lương tháng sau.", en: "Overtime pay will be paid together with next month's salary." }
      ]
    },
    {
      kind: "write",
      prompt: { vi: "Viết thông báo lương tháng 11: lương trả ngày 10/12, phiếu lương đã gửi email, có thắc mắc thì liên hệ nhân sự trước ngày 12/12. Dài 4-5 câu.", en: "Write the November payroll notice: pay date December 10, pay slip sent by email, questions to HR before December 12. 4-5 sentences." },
      mustUse: ["发放", "核对", "疑问", "查收"],
      sample: [
        { zh: "各位同事：", py: "Gèwèi tóngshì:", vi: "Kính gửi các đồng nghiệp:", en: "Dear colleagues," },
        { zh: "11月份工资将于12月10日发放，请大家注意查收。", py: "Shíyī yuèfèn gōngzī jiāng yú shí'èr yuè shí rì fāfàng, qǐng dàjiā zhùyì cháshōu.", vi: "Lương tháng 11 sẽ được chi trả vào ngày 10/12, mong mọi người chú ý kiểm tra nhận lương.", en: "November salary will be paid on December 10. Please check that you have received it." },
        { zh: "工资条已发送至公司邮箱，请核对明细。", py: "Gōngzītiáo yǐ fāsòng zhì gōngsī yóuxiāng, qǐng héduì míngxì.", vi: "Phiếu lương đã gửi tới email công ty, xin đối chiếu chi tiết.", en: "The pay slip has been sent to your company email. Please check the details." },
        { zh: "如有疑问，请在12月12日前联系人事部。", py: "Rú yǒu yíwèn, qǐng zài shí'èr yuè shí'èr rì qián liánxì rénshìbù.", vi: "Nếu có thắc mắc, xin liên hệ phòng Nhân sự trước ngày 12/12.", en: "If you have questions, please contact HR before December 12." },
        { zh: "感谢大家的配合。", py: "Gǎnxiè dàjiā de pèihé.", vi: "Cảm ơn sự phối hợp của mọi người.", en: "Thank you for your cooperation." }
      ],
      checklist: [
        { vi: "Có lời chào đầu thư (各位同事).", en: "Opens with a greeting (各位同事)." },
        { vi: "Nêu rõ ngày chi trả bằng 将于……发放.", en: "States the pay date with 将于……发放." },
        { vi: "Nhắc đối chiếu phiếu lương và cách hỏi lại (如有疑问).", en: "Asks people to check the slip and says how to ask questions (如有疑问)." },
        { vi: "Có hạn chót liên hệ và lời cảm ơn cuối thư.", en: "Gives a contact deadline and ends with thanks." }
      ]
    }
  ]
},
{
  week: 2, block: "templates",
  title: { zh: "制度通知", vi: "Thông báo chính sách, quy chế", en: "Policy announcement" },
  goal: { vi: "Viết thông báo điều chỉnh quy chế: lý do, ngày hiệu lực, yêu cầu và quy định cũ hết hiệu lực.", en: "Write a policy-change announcement: reason, effective date, requirements and what the old rule replaces." },
  sessions: [
    {
      kind: "model",
      title: { zh: "范文：关于调整考勤制度的通知", vi: "Mẫu: thông báo điều chỉnh quy chế chấm công", en: "Model: notice on adjusting the attendance policy" },
      scenario: { vi: "Sau khi Tổng công ty phê duyệt, chị Nguyễn gửi thông báo chuyển sang chấm công bằng ứng dụng điện thoại.", en: "After HQ approval, Ms. Nguyen announces the switch to clocking in by phone app." },
      text: [
        { zh: "关于调整考勤制度的通知", py: "Guānyú tiáozhěng kǎoqín zhìdù de tōngzhī", vi: "Thông báo về việc điều chỉnh quy chế chấm công", en: "Notice on adjusting the attendance policy" },
        { zh: "各部门：", py: "Gè bùmén:", vi: "Gửi các phòng ban:", en: "To all departments:" },
        { zh: "为了规范公司管理，经总部批准，公司决定调整考勤制度。", py: "Wèile guīfàn gōngsī guǎnlǐ, jīng zǒngbù pīzhǔn, gōngsī juédìng tiáozhěng kǎoqín zhìdù.", vi: "Nhằm chuẩn hóa quản lý, sau khi được Tổng công ty phê duyệt, công ty quyết định điều chỉnh quy chế chấm công.", en: "To standardize management, with HQ approval, the company has decided to adjust the attendance policy." },
        { zh: "自11月1日起，全体员工须通过手机应用打卡上下班。", py: "Zì shíyī yuè yī rì qǐ, quántǐ yuángōng xū tōngguò shǒujī yìngyòng dǎkǎ shàngxiàbān.", vi: "Từ ngày 1/11, toàn thể nhân viên phải chấm công vào ra ca bằng ứng dụng điện thoại.", en: "From November 1, all employees must clock in and out through the phone app." },
        { zh: "迟到或早退超过三次的，将按公司规定处理。", py: "Chídào huò zǎotuì chāoguò sān cì de, jiāng àn gōngsī guīdìng chǔlǐ.", vi: "Trường hợp đi muộn hoặc về sớm quá ba lần sẽ được xử lý theo quy định của công ty.", en: "Anyone late or leaving early more than three times will be dealt with according to company rules." },
        { zh: "因公外出或请假，须提前在系统中提交申请。", py: "Yīn gōng wàichū huò qǐngjià, xū tíqián zài xìtǒng zhōng tíjiāo shēnqǐng.", vi: "Đi công tác hoặc xin nghỉ phải nộp đơn trên hệ thống trước.", en: "For business trips or leave, an application must be submitted in the system in advance." },
        { zh: "本通知自发布之日起执行，原有规定同时废止。", py: "Běn tōngzhī zì fābù zhī rì qǐ zhíxíng, yuányǒu guīdìng tóngshí fèizhǐ.", vi: "Thông báo này có hiệu lực kể từ ngày ban hành, quy định cũ đồng thời hết hiệu lực.", en: "This notice takes effect from the date of issue, and the original rules are repealed at the same time." },
        { zh: "如有疑问，请咨询人事部。", py: "Rú yǒu yíwèn, qǐng zīxún rénshìbù.", vi: "Nếu có thắc mắc, xin hỏi phòng Nhân sự.", en: "If you have questions, please consult HR." },
        { zh: "人事部 阮经理", py: "Rénshìbù Ruǎn jīnglǐ", vi: "Phòng Nhân sự, chị Nguyễn", en: "HR Department, Ms. Nguyen" }
      ],
      phrases: [
        { zh: "为了……，决定……", py: "wèile ..., juédìng ...", vi: "nhằm ..., quyết định ...", en: "in order to ..., (we) have decided to ..." },
        { zh: "经总部批准", py: "jīng zǒngbù pīzhǔn", vi: "sau khi được Tổng công ty phê duyệt", en: "with HQ's approval" },
        { zh: "自……起", py: "zì ... qǐ", vi: "kể từ ...", en: "starting from ..." },
        { zh: "须提前……", py: "xū tíqián ...", vi: "phải ... trước", en: "must ... in advance" },
        { zh: "按公司规定处理", py: "àn gōngsī guīdìng chǔlǐ", vi: "xử lý theo quy định công ty", en: "handle according to company rules" },
        { zh: "原有规定同时废止", py: "yuányǒu guīdìng tóngshí fèizhǐ", vi: "quy định cũ đồng thời hết hiệu lực", en: "the original rules are repealed at the same time" }
      ]
    },
    {
      kind: "fill",
      items: [
        { zh: "___11月1日起，全体员工须用手机打卡。", answer: "自", options: ["自", "把", "被", "比"], vi: "Từ ngày 1/11, toàn thể nhân viên phải chấm công bằng điện thoại.", en: "From November 1, all employees must clock in with their phones." },
        { zh: "为了___公司管理，公司决定调整制度。", answer: "规范", options: ["规范", "执行", "废止", "批准"], vi: "Nhằm chuẩn hóa quản lý, công ty quyết định điều chỉnh quy chế.", en: "To standardize management, the company has decided to adjust the policy." },
        { zh: "这个制度经总部___后正式发布。", answer: "批准", options: ["批准", "废止", "打卡", "迟到"], vi: "Quy chế này được ban hành chính thức sau khi Tổng công ty phê duyệt.", en: "This policy was officially issued after HQ approved it." },
        { zh: "员工请假，___提前提交申请。", answer: "须", options: ["须", "刚", "曾", "已"], vi: "Nhân viên xin nghỉ phải nộp đơn trước.", en: "Employees who take leave must submit an application in advance." },
        { zh: "本通知自发布之日起___。", answer: "执行", options: ["执行", "打卡", "迟到", "请假"], vi: "Thông báo này được thực hiện kể từ ngày ban hành.", en: "This notice is to be implemented from the date of issue." },
        { zh: "新制度实施后，原有规定同时___。", answer: "废止", options: ["废止", "执行", "批准", "规范"], vi: "Sau khi quy chế mới được áp dụng, quy định cũ đồng thời hết hiệu lực.", en: "After the new policy is implemented, the original rules are repealed at the same time." }
      ]
    },
    {
      kind: "write",
      prompt: { vi: "Viết thông báo ngắn: từ 1/12, nhân viên muốn làm thêm giờ phải nộp đơn trên hệ thống trước. Nêu lý do, ngày hiệu lực và yêu cầu. Dài 4-5 câu.", en: "Write a short notice: from December 1, employees who want to work overtime must apply in the system in advance. Give the reason, effective date and requirement. 4-5 sentences." },
      mustUse: ["为了", "自", "须", "执行"],
      sample: [
        { zh: "关于加班申请流程的通知", py: "Guānyú jiābān shēnqǐng liúchéng de tōngzhī", vi: "Thông báo về quy trình đăng ký làm thêm giờ", en: "Notice on the overtime application process" },
        { zh: "为了规范加班管理，公司决定调整加班申请流程。", py: "Wèile guīfàn jiābān guǎnlǐ, gōngsī juédìng tiáozhěng jiābān shēnqǐng liúchéng.", vi: "Nhằm chuẩn hóa quản lý làm thêm giờ, công ty quyết định điều chỉnh quy trình đăng ký làm thêm.", en: "To standardize overtime management, the company has decided to adjust the overtime application process." },
        { zh: "自12月1日起，员工加班须提前在系统中提交申请。", py: "Zì shí'èr yuè yī rì qǐ, yuángōng jiābān xū tíqián zài xìtǒng zhōng tíjiāo shēnqǐng.", vi: "Từ ngày 1/12, nhân viên làm thêm giờ phải nộp đơn trên hệ thống trước.", en: "From December 1, employees who work overtime must submit an application in the system in advance." },
        { zh: "本通知自发布之日起执行。", py: "Běn tōngzhī zì fābù zhī rì qǐ zhíxíng.", vi: "Thông báo này được thực hiện kể từ ngày ban hành.", en: "This notice is to be implemented from the date of issue." },
        { zh: "如有疑问，请咨询人事部。", py: "Rú yǒu yíwèn, qǐng zīxún rénshìbù.", vi: "Nếu có thắc mắc, xin hỏi phòng Nhân sự.", en: "If you have questions, please consult HR." }
      ],
      checklist: [
        { vi: "Có tiêu đề dạng 关于……的通知.", en: "Has a title in the form 关于……的通知." },
        { vi: "Nêu lý do bằng 为了……，决定……", en: "States the reason with 为了……，决定……" },
        { vi: "Ghi ngày hiệu lực (自……起) và yêu cầu bắt buộc (须).", en: "Gives the effective date (自……起) and the requirement (须)." },
        { vi: "Có câu kết hướng dẫn người đọc hỏi ai.", en: "Ends by telling readers whom to ask." }
      ]
    }
  ]
},
{
  week: 3, block: "templates",
  title: { zh: "录用通知书", vi: "Thư mời nhận việc", en: "Offer letter" },
  goal: { vi: "Viết thư mời nhận việc: vị trí, thử việc, lương, hạn trả lời, thủ tục nhập việc.", en: "Write an offer letter: position, probation, pay, reply deadline and onboarding steps." },
  sessions: [
    {
      kind: "model",
      title: { zh: "范文：录用通知书", vi: "Mẫu: thư mời nhận việc", en: "Model: offer letter" },
      scenario: { vi: "Phòng Nhân sự gửi thư mời nhận việc vị trí chuyên viên nhân sự cho ứng viên Trần Minh sau vòng phỏng vấn cuối.", en: "HR sends an HR specialist offer to the candidate Chen Ming after the final interview." },
      text: [
        { zh: "录用通知书", py: "Lùyòng tōngzhīshū", vi: "Thư mời nhận việc", en: "Offer letter" },
        { zh: "尊敬的陈明先生：", py: "Zūnjìng de Chén Míng xiānsheng:", vi: "Kính gửi anh Trần Minh:", en: "Dear Mr. Chen Ming," },
        { zh: "感谢您参加我公司的面试。经研究，我们决定录用您担任人事专员一职。", py: "Gǎnxiè nín cānjiā wǒ gōngsī de miànshì. Jīng yánjiū, wǒmen juédìng lùyòng nín dānrèn rénshì zhuānyuán yī zhí.", vi: "Cảm ơn anh đã tham gia phỏng vấn tại công ty. Sau khi xem xét, chúng tôi quyết định tuyển dụng anh vào vị trí chuyên viên nhân sự.", en: "Thank you for attending the interview at our company. After review, we have decided to hire you as an HR specialist." },
        { zh: "您的工作地点为河内，试用期为两个月，试用期工资不低于正式工资的百分之八十五。", py: "Nín de gōngzuò dìdiǎn wèi Hénèi, shìyòngqī wèi liǎng gè yuè, shìyòngqī gōngzī bù dī yú zhèngshì gōngzī de bǎi fēn zhī bāshíwǔ.", vi: "Địa điểm làm việc là Hà Nội, thời gian thử việc là hai tháng, lương thử việc không thấp hơn 85% lương chính thức.", en: "Your workplace is Hanoi, the probation period is two months, and probation pay is not lower than 85 percent of the regular salary." },
        { zh: "您的月基本工资为两千万越南盾，另有绩效奖金和各项福利。", py: "Nín de yuè jīběn gōngzī wèi liǎng qiān wàn Yuènán dùn, lìng yǒu jìxiào jiǎngjīn hé gè xiàng fúlì.", vi: "Lương cơ bản hằng tháng là 20 triệu đồng, ngoài ra có thưởng hiệu suất và các phúc lợi.", en: "Your basic monthly salary is 20 million VND, plus a performance bonus and various benefits." },
        { zh: "请于10月20日前回复是否接受，并携带相关证件办理入职手续。", py: "Qǐng yú shí yuè èrshí rì qián huífù shìfǒu jiēshòu, bìng xiédài xiāngguān zhèngjiàn bànlǐ rùzhí shǒuxù.", vi: "Xin trả lời trước ngày 20/10 về việc có nhận hay không, và mang theo giấy tờ liên quan để làm thủ tục nhập việc.", en: "Please reply by October 20 on whether you accept, and bring the relevant documents to complete onboarding." },
        { zh: "入职后，公司将与您签订劳动合同，并依法为您缴纳社会保险。", py: "Rùzhí hòu, gōngsī jiāng yǔ nín qiāndìng láodòng hétong, bìng yīfǎ wèi nín jiǎonà shèhuì bǎoxiǎn.", vi: "Sau khi nhập việc, công ty sẽ ký hợp đồng lao động với anh và đóng bảo hiểm xã hội theo quy định pháp luật.", en: "After you join, the company will sign a labour contract with you and pay social insurance for you in accordance with the law." },
        { zh: "本通知书不是劳动合同，具体条款以劳动合同为准。", py: "Běn tōngzhīshū bú shì láodòng hétong, jùtǐ tiáokuǎn yǐ láodòng hétong wéi zhǔn.", vi: "Thư này không phải là hợp đồng lao động, các điều khoản cụ thể lấy hợp đồng lao động làm chuẩn.", en: "This letter is not a labour contract; the specific terms are subject to the labour contract." },
        { zh: "期待您的加入！", py: "Qīdài nín de jiārù!", vi: "Mong chờ anh gia nhập!", en: "We look forward to you joining us!" },
        { zh: "人事部 阮经理", py: "Rénshìbù Ruǎn jīnglǐ", vi: "Phòng Nhân sự, chị Nguyễn", en: "HR Department, Ms. Nguyen" }
      ],
      phrases: [
        { zh: "经研究，决定录用您", py: "jīng yánjiū, juédìng lùyòng nín", vi: "sau khi xem xét, quyết định tuyển dụng anh/chị", en: "after review, we have decided to hire you" },
        { zh: "担任……一职", py: "dānrèn ... yī zhí", vi: "đảm nhiệm vị trí ...", en: "to hold the post of ..." },
        { zh: "请于……前回复", py: "qǐng yú ... qián huífù", vi: "xin trả lời trước ...", en: "please reply before ..." },
        { zh: "办理入职手续", py: "bànlǐ rùzhí shǒuxù", vi: "làm thủ tục nhập việc", en: "complete onboarding formalities" },
        { zh: "依法缴纳社会保险", py: "yīfǎ jiǎonà shèhuì bǎoxiǎn", vi: "đóng bảo hiểm xã hội theo pháp luật", en: "pay social insurance according to law" },
        { zh: "以……为准", py: "yǐ ... wéi zhǔn", vi: "lấy ... làm chuẩn", en: "subject to ..." }
      ]
    },
    {
      kind: "fill",
      items: [
        { zh: "经研究，我们决定___您担任人事专员。", answer: "录用", options: ["录用", "面试", "回复", "签订"], vi: "Sau khi xem xét, chúng tôi quyết định tuyển dụng anh vào vị trí chuyên viên nhân sự.", en: "After review, we have decided to hire you as an HR specialist." },
        { zh: "请于10月20日前___是否接受。", answer: "回复", options: ["回复", "录用", "缴纳", "担任"], vi: "Xin trả lời trước ngày 20/10 về việc có nhận hay không.", en: "Please reply by October 20 on whether you accept." },
        { zh: "请携带证件，办理入职___。", answer: "手续", options: ["手续", "条款", "福利", "地点"], vi: "Xin mang giấy tờ để làm thủ tục nhập việc.", en: "Please bring your documents and complete the onboarding formalities." },
        { zh: "入职后，公司将与您___劳动合同。", answer: "签订", options: ["签订", "缴纳", "回复", "录用"], vi: "Sau khi nhập việc, công ty sẽ ký hợp đồng lao động với anh.", en: "After you join, the company will sign a labour contract with you." },
        { zh: "具体条款以劳动合同___。", answer: "为准", options: ["为准", "为了", "为难", "为止"], vi: "Các điều khoản cụ thể lấy hợp đồng lao động làm chuẩn.", en: "The specific terms are subject to the labour contract." },
        { zh: "公司依法为员工___社会保险。", answer: "缴纳", options: ["缴纳", "签订", "录用", "回复"], vi: "Công ty đóng bảo hiểm xã hội cho nhân viên theo quy định pháp luật.", en: "The company pays social insurance for employees in accordance with the law." }
      ]
    },
    {
      kind: "write",
      prompt: { vi: "Viết thư mời nhận việc cho bà Lý Hoa, vị trí chuyên viên tài chính, nhập việc ngày 1/11, thử việc hai tháng, trả lời trước ngày 25/10. Dài 4-5 câu.", en: "Write an offer letter to Ms. Li Hua for a finance specialist post, starting November 1, two-month probation, reply by October 25. 4-5 sentences." },
      mustUse: ["录用", "担任", "试用期", "为准"],
      sample: [
        { zh: "尊敬的李华女士：", py: "Zūnjìng de Lǐ Huá nǚshì:", vi: "Kính gửi chị Lý Hoa:", en: "Dear Ms. Li Hua," },
        { zh: "经研究，我们决定录用您担任财务专员一职。", py: "Jīng yánjiū, wǒmen juédìng lùyòng nín dānrèn cáiwù zhuānyuán yī zhí.", vi: "Sau khi xem xét, chúng tôi quyết định tuyển dụng chị vào vị trí chuyên viên tài chính.", en: "After review, we have decided to hire you as a finance specialist." },
        { zh: "试用期为两个月，您的入职日期为11月1日。", py: "Shìyòngqī wèi liǎng gè yuè, nín de rùzhí rìqī wèi shíyī yuè yī rì.", vi: "Thời gian thử việc là hai tháng, ngày nhập việc của chị là 1/11.", en: "The probation period is two months, and your start date is November 1." },
        { zh: "具体条款以劳动合同为准。", py: "Jùtǐ tiáokuǎn yǐ láodòng hétong wéi zhǔn.", vi: "Các điều khoản cụ thể lấy hợp đồng lao động làm chuẩn.", en: "The specific terms are subject to the labour contract." },
        { zh: "请于10月25日前回复，期待您的加入！", py: "Qǐng yú shí yuè èrshíwǔ rì qián huífù, qīdài nín de jiārù!", vi: "Xin trả lời trước ngày 25/10, mong chờ chị gia nhập!", en: "Please reply by October 25. We look forward to you joining us!" }
      ],
      checklist: [
        { vi: "Có xưng hô trang trọng (尊敬的……先生/女士).", en: "Uses a formal salutation (尊敬的……先生/女士)." },
        { vi: "Nêu rõ vị trí bằng 担任……一职.", en: "States the position with 担任……一职." },
        { vi: "Có thời gian thử việc, ngày nhập việc và hạn trả lời.", en: "Includes probation length, start date and reply deadline." },
        { vi: "Ghi chú rằng điều khoản cụ thể theo hợp đồng lao động (以……为准).", en: "Notes that specific terms follow the labour contract (以……为准)." }
      ]
    }
  ]
},
{
  week: 4, block: "templates",
  title: { zh: "终止劳动合同通知", vi: "Thông báo chấm dứt hợp đồng lao động", en: "Contract-end notice" },
  goal: { vi: "Viết thông báo hợp đồng hết hạn và không tái ký: lịch bàn giao, thủ tục nghỉ việc, thanh toán lương, giấy xác nhận.", en: "Write a notice that a contract is expiring and will not be renewed: handover, exit formalities, final pay and certificate." },
  sessions: [
    {
      kind: "model",
      title: { zh: "范文：终止劳动合同通知书", vi: "Mẫu: thông báo chấm dứt hợp đồng lao động", en: "Model: notice of contract termination" },
      scenario: { vi: "Hợp đồng lao động có thời hạn của anh Chu Cường sắp hết hạn; công ty không tái ký và gửi thông báo chính thức.", en: "Zhou Qiang's fixed-term contract is about to expire; the company will not renew it and sends a formal notice." },
      text: [
        { zh: "终止劳动合同通知书", py: "Zhōngzhǐ láodòng hétong tōngzhīshū", vi: "Thông báo chấm dứt hợp đồng lao động", en: "Notice of termination of labour contract" },
        { zh: "周强先生：", py: "Zhōu Qiáng xiānsheng:", vi: "Gửi anh Chu Cường:", en: "Dear Mr. Zhou Qiang," },
        { zh: "您与公司签订的劳动合同将于11月30日期满。", py: "Nín yǔ gōngsī qiāndìng de láodòng hétong jiāng yú shíyī yuè sānshí rì qīmǎn.", vi: "Hợp đồng lao động anh ký với công ty sẽ hết hạn vào ngày 30/11.", en: "The labour contract you signed with the company will expire on November 30." },
        { zh: "经研究，公司决定合同期满后不再续签。", py: "Jīng yánjiū, gōngsī juédìng hétong qīmǎn hòu bù zài xùqiān.", vi: "Sau khi xem xét, công ty quyết định không tái ký sau khi hợp đồng hết hạn.", en: "After review, the company has decided not to renew the contract after it expires." },
        { zh: "请在11月30日前完成工作交接，并办理离职手续。", py: "Qǐng zài shíyī yuè sānshí rì qián wánchéng gōngzuò jiāojiē, bìng bànlǐ lízhí shǒuxù.", vi: "Xin hoàn thành bàn giao công việc và làm thủ tục nghỉ việc trước ngày 30/11.", en: "Please complete the handover of your work and the exit formalities before November 30." },
        { zh: "公司将依法结清您的工资及其他应得款项。", py: "Gōngsī jiāng yīfǎ jiéqīng nín de gōngzī jí qítā yīng dé kuǎnxiàng.", vi: "Công ty sẽ thanh toán đầy đủ lương và các khoản anh được hưởng theo quy định pháp luật.", en: "The company will, in accordance with the law, settle your salary and other amounts due to you." },
        { zh: "公司将依法办理社会保险等相关手续，并开具离职证明。", py: "Gōngsī jiāng yīfǎ bànlǐ shèhuì bǎoxiǎn děng xiāngguān shǒuxù, bìng kāijù lízhí zhèngmíng.", vi: "Công ty sẽ làm các thủ tục liên quan như bảo hiểm xã hội theo quy định pháp luật và cấp giấy xác nhận nghỉ việc.", en: "The company will, in accordance with the law, handle social insurance and other related formalities, and issue a certificate of employment end." },
        { zh: "感谢您为公司所做的贡献，祝您今后一切顺利。", py: "Gǎnxiè nín wèi gōngsī suǒ zuò de gòngxiàn, zhù nín jīnhòu yīqiè shùnlì.", vi: "Cảm ơn những đóng góp của anh cho công ty, chúc anh mọi điều thuận lợi trong thời gian tới.", en: "Thank you for your contributions to the company, and we wish you all the best." },
        { zh: "人事部 阮经理", py: "Rénshìbù Ruǎn jīnglǐ", vi: "Phòng Nhân sự, chị Nguyễn", en: "HR Department, Ms. Nguyen" }
      ],
      phrases: [
        { zh: "将于……期满", py: "jiāng yú ... qīmǎn", vi: "sẽ hết hạn vào ...", en: "will expire on ..." },
        { zh: "不再续签", py: "bù zài xùqiān", vi: "không tái ký nữa", en: "will not be renewed" },
        { zh: "完成工作交接", py: "wánchéng gōngzuò jiāojiē", vi: "hoàn thành bàn giao công việc", en: "complete the work handover" },
        { zh: "办理离职手续", py: "bànlǐ lízhí shǒuxù", vi: "làm thủ tục nghỉ việc", en: "complete resignation/exit formalities" },
        { zh: "结清工资及其他应得款项", py: "jiéqīng gōngzī jí qítā yīng dé kuǎnxiàng", vi: "thanh toán dứt điểm lương và các khoản được hưởng khác", en: "settle salary and other amounts due" },
        { zh: "开具离职证明", py: "kāijù lízhí zhèngmíng", vi: "cấp giấy xác nhận nghỉ việc", en: "issue an employment-end certificate" }
      ]
    },
    {
      kind: "fill",
      items: [
        { zh: "您的劳动合同将于11月30日___。", answer: "期满", options: ["期满", "续签", "交接", "结清"], vi: "Hợp đồng lao động của anh sẽ hết hạn vào ngày 30/11.", en: "Your labour contract will expire on November 30." },
        { zh: "公司决定合同期满后不再___。", answer: "续签", options: ["续签", "期满", "交接", "开具"], vi: "Công ty quyết định không tái ký sau khi hợp đồng hết hạn.", en: "The company has decided not to renew the contract after it expires." },
        { zh: "请在离职前完成工作___。", answer: "交接", options: ["交接", "期满", "结清", "续签"], vi: "Xin hoàn thành bàn giao công việc trước khi nghỉ việc.", en: "Please complete the work handover before you leave." },
        { zh: "公司将依法___工资及其他款项。", answer: "结清", options: ["结清", "交接", "续签", "期满"], vi: "Công ty sẽ thanh toán dứt điểm lương và các khoản khác theo quy định pháp luật.", en: "The company will settle salary and other amounts in accordance with the law." },
        { zh: "请到人事部办理离职___。", answer: "手续", options: ["手续", "贡献", "福利", "地点"], vi: "Xin đến phòng Nhân sự làm thủ tục nghỉ việc.", en: "Please go to HR to complete the exit formalities." },
        { zh: "公司将为您开具离职___。", answer: "证明", options: ["证明", "手续", "贡献", "交接"], vi: "Công ty sẽ cấp cho anh giấy xác nhận nghỉ việc.", en: "The company will issue you a certificate of employment end." }
      ]
    },
    {
      kind: "write",
      prompt: { vi: "Viết thông báo gửi anh Lý Minh: hợp đồng hết hạn ngày 31/12 và công ty không tái ký. Yêu cầu bàn giao và làm thủ tục nghỉ việc, hứa thanh toán lương và cấp giấy xác nhận, cuối thư cảm ơn. Dài 4-5 câu.", en: "Write a notice to Li Ming: contract expires December 31 and will not be renewed. Ask for handover and exit formalities, promise final pay and a certificate, and end with thanks. 4-5 sentences." },
      mustUse: ["期满", "交接", "手续", "证明"],
      sample: [
        { zh: "李明先生：", py: "Lǐ Míng xiānsheng:", vi: "Gửi anh Lý Minh:", en: "Dear Mr. Li Ming," },
        { zh: "您的劳动合同将于12月31日期满，公司决定不再续签。", py: "Nín de láodòng hétong jiāng yú shí'èr yuè sānshíyī rì qīmǎn, gōngsī juédìng bù zài xùqiān.", vi: "Hợp đồng lao động của anh sẽ hết hạn vào ngày 31/12, công ty quyết định không tái ký.", en: "Your labour contract will expire on December 31, and the company has decided not to renew it." },
        { zh: "请在12月31日前完成工作交接，并办理离职手续。", py: "Qǐng zài shí'èr yuè sānshíyī rì qián wánchéng gōngzuò jiāojiē, bìng bànlǐ lízhí shǒuxù.", vi: "Xin hoàn thành bàn giao công việc và làm thủ tục nghỉ việc trước ngày 31/12.", en: "Please complete the work handover and exit formalities before December 31." },
        { zh: "公司将依法结清工资，并开具离职证明。", py: "Gōngsī jiāng yīfǎ jiéqīng gōngzī, bìng kāijù lízhí zhèngmíng.", vi: "Công ty sẽ thanh toán lương theo quy định pháp luật và cấp giấy xác nhận nghỉ việc.", en: "The company will settle your salary in accordance with the law and issue a certificate." },
        { zh: "感谢您的贡献，祝您一切顺利。", py: "Gǎnxiè nín de gòngxiàn, zhù nín yīqiè shùnlì.", vi: "Cảm ơn đóng góp của anh, chúc anh mọi điều thuận lợi.", en: "Thank you for your contributions, and we wish you all the best." }
      ],
      checklist: [
        { vi: "Nêu rõ ngày hết hạn và việc không tái ký.", en: "States the expiry date and the decision not to renew." },
        { vi: "Có hạn bàn giao và thủ tục nghỉ việc cụ thể.", en: "Gives a clear handover and exit-formalities deadline." },
        { vi: "Cam kết lương và giấy xác nhận một cách thận trọng (依法).", en: "Commits to final pay and the certificate in careful wording (依法)." },
        { vi: "Giọng văn lịch sự, không đổ lỗi, kết bằng lời cảm ơn.", en: "Polite, non-blaming tone and a closing note of thanks." }
      ]
    }
  ]
},
{
  week: 5, block: "templates",
  title: { zh: "会议纪要", vi: "Biên bản họp", en: "Meeting minutes" },
  goal: { vi: "Viết biên bản họp gọn: thời gian, thành phần, chủ đề, quyết định, việc cần làm và buổi họp tiếp theo.", en: "Write concise minutes: time, attendees, topic, decisions, action items and next meeting." },
  sessions: [
    {
      kind: "model",
      title: { zh: "范文：薪酬调整方案会议纪要", vi: "Mẫu: biên bản họp phương án điều chỉnh lương", en: "Model: minutes on the pay adjustment plan" },
      scenario: { vi: "Anh Lâm Hạo ghi biên bản cuộc họp với ông Vương về phương án điều chỉnh lương năm sau.", en: "Lin Hao records the minutes of a meeting with Mr. Wang on next year's pay adjustment plan." },
      text: [
        { zh: "会议纪要", py: "Huìyì jìyào", vi: "Biên bản họp", en: "Meeting minutes" },
        { zh: "时间：10月8日下午3点；地点：三楼会议室", py: "Shíjiān: shí yuè bā rì xiàwǔ sān diǎn; dìdiǎn: sān lóu huìyìshì", vi: "Thời gian: 15 giờ ngày 8/10; địa điểm: phòng họp tầng 3", en: "Time: October 8, 3 p.m.; place: third-floor meeting room" },
        { zh: "参会人员：王总、阮经理、黄玲、林浩", py: "Cānhuì rényuán: Wáng zǒng, Ruǎn jīnglǐ, Huáng Líng, Lín Hào", vi: "Người tham dự: ông Vương, chị Nguyễn, Hoàng Linh, Lâm Hạo", en: "Attendees: Mr. Wang, Ms. Nguyen, Huang Ling, Lin Hao" },
        { zh: "会议主题：讨论明年的薪酬调整方案", py: "Huìyì zhǔtí: tǎolùn míngnián de xīnchóu tiáozhěng fāng'àn", vi: "Chủ đề: thảo luận phương án điều chỉnh lương năm sau", en: "Topic: discuss next year's pay adjustment plan" },
        { zh: "会议讨论：大家认为，调薪应结合公司业绩和岗位市场水平。", py: "Huìyì tǎolùn: dàjiā rènwéi, tiáoxīn yīng jiéhé gōngsī yèjì hé gǎngwèi shìchǎng shuǐpíng.", vi: "Nội dung thảo luận: mọi người cho rằng điều chỉnh lương cần kết hợp kết quả kinh doanh và mức thị trường của vị trí.", en: "Discussion: everyone agreed that pay adjustments should consider company performance and the market level for each position." },
        { zh: "会议决定：明年调薪方案由人事部负责起草，报王总审批。", py: "Huìyì juédìng: míngnián tiáoxīn fāng'àn yóu rénshìbù fùzé qǐcǎo, bào Wáng zǒng shěnpī.", vi: "Quyết định: phương án điều chỉnh lương năm sau do phòng Nhân sự phụ trách soạn thảo, trình ông Vương phê duyệt.", en: "Decision: HR is responsible for drafting next year's pay adjustment plan and submitting it to Mr. Wang for approval." },
        { zh: "待办事项：黄玲于10月20日前提交初稿；林浩负责收集同行薪酬数据。", py: "Dàibàn shìxiàng: Huáng Líng yú shí yuè èrshí rì qián tíjiāo chūgǎo; Lín Hào fùzé shōují tóngháng xīnchóu shùjù.", vi: "Việc cần làm: Hoàng Linh nộp bản thảo đầu trước ngày 20/10; Lâm Hạo phụ trách thu thập dữ liệu lương của các công ty cùng ngành.", en: "Action items: Huang Ling submits the first draft by October 20; Lin Hao is responsible for collecting industry pay data." },
        { zh: "下次会议：10月25日上午10点，讨论初稿。", py: "Xià cì huìyì: shí yuè èrshíwǔ rì shàngwǔ shí diǎn, tǎolùn chūgǎo.", vi: "Họp lần sau: 10 giờ ngày 25/10, thảo luận bản thảo đầu.", en: "Next meeting: October 25, 10 a.m., to discuss the first draft." },
        { zh: "记录人：林浩", py: "Jìlùrén: Lín Hào", vi: "Người ghi biên bản: Lâm Hạo", en: "Recorded by: Lin Hao" }
      ],
      phrases: [
        { zh: "参会人员", py: "cānhuì rényuán", vi: "người tham dự", en: "attendees" },
        { zh: "会议主题", py: "huìyì zhǔtí", vi: "chủ đề cuộc họp", en: "meeting topic" },
        { zh: "会议决定", py: "huìyì juédìng", vi: "quyết định của cuộc họp", en: "decision of the meeting" },
        { zh: "由……负责", py: "yóu ... fùzé", vi: "do ... phụ trách", en: "... is responsible for" },
        { zh: "于……前提交", py: "yú ... qián tíjiāo", vi: "nộp trước ...", en: "submit before ..." },
        { zh: "待办事项", py: "dàibàn shìxiàng", vi: "việc cần làm", en: "action items" }
      ]
    },
    {
      kind: "fill",
      items: [
        { zh: "会议___：讨论明年的调薪方案。", answer: "主题", options: ["主题", "人员", "事项", "下次"], vi: "Chủ đề cuộc họp: thảo luận phương án tăng lương năm sau.", en: "Meeting topic: discuss next year's pay raise plan." },
        { zh: "参会___有王总、阮经理和黄玲。", answer: "人员", options: ["人员", "主题", "决定", "事项"], vi: "Người tham dự có ông Vương, chị Nguyễn và Hoàng Linh.", en: "Attendees include Mr. Wang, Ms. Nguyen and Huang Ling." },
        { zh: "会议___：方案由人事部起草。", answer: "决定", options: ["决定", "人员", "主题", "记录"], vi: "Quyết định của cuộc họp: phương án do phòng Nhân sự soạn thảo.", en: "Decision of the meeting: HR will draft the plan." },
        { zh: "初稿由黄玲___起草。", answer: "负责", options: ["负责", "于", "把", "比"], vi: "Bản thảo đầu do Hoàng Linh phụ trách soạn thảo.", en: "Huang Ling is responsible for drafting the first draft." },
        { zh: "林浩___10月20日前提交数据。", answer: "于", options: ["于", "把", "被", "比"], vi: "Lâm Hạo nộp dữ liệu trước ngày 20/10.", en: "Lin Hao submits the data before October 20." },
        { zh: "请各位按___事项跟进。", answer: "待办", options: ["待办", "参会", "主题", "记录"], vi: "Xin mọi người theo dõi theo các việc cần làm.", en: "Everyone, please follow up according to the action items." }
      ]
    },
    {
      kind: "write",
      prompt: { vi: "Viết biên bản họp ngắn: ngày 3/11, chủ đề thời điểm chi thưởng cuối năm; người tham dự chị Nguyễn, Hoàng Linh, Lâm Hạo; quyết định chi thưởng ngày 15/1 do Hoàng Linh phụ trách danh sách; Lâm Hạo nộp dữ liệu thưởng trước 10/11. Dài 4-5 dòng.", en: "Write short minutes: November 3, topic is the year-end bonus payment date; attendees Ms. Nguyen, Huang Ling, Lin Hao; decision to pay on January 15 with Huang Ling preparing the list; Lin Hao submits bonus data before November 10. 4-5 lines." },
      mustUse: ["会议决定", "负责", "提交", "待办事项"],
      sample: [
        { zh: "会议纪要：年终奖发放安排", py: "Huìyì jìyào: niánzhōngjiǎng fāfàng ānpái", vi: "Biên bản họp: sắp xếp chi thưởng cuối năm", en: "Meeting minutes: year-end bonus payment arrangements" },
        { zh: "时间：11月3日上午9点；参会人员：阮经理、黄玲、林浩。", py: "Shíjiān: shíyī yuè sān rì shàngwǔ jiǔ diǎn; cānhuì rényuán: Ruǎn jīnglǐ, Huáng Líng, Lín Hào.", vi: "Thời gian: 9 giờ ngày 3/11; người tham dự: chị Nguyễn, Hoàng Linh, Lâm Hạo.", en: "Time: November 3, 9 a.m.; attendees: Ms. Nguyen, Huang Ling, Lin Hao." },
        { zh: "会议决定：年终奖于1月15日发放，由黄玲负责准备名单。", py: "Huìyì juédìng: niánzhōngjiǎng yú yī yuè shíwǔ rì fāfàng, yóu Huáng Líng fùzé zhǔnbèi míngdān.", vi: "Quyết định: thưởng cuối năm chi trả ngày 15/1, Hoàng Linh phụ trách chuẩn bị danh sách.", en: "Decision: the year-end bonus will be paid on January 15, and Huang Ling is responsible for preparing the list." },
        { zh: "待办事项：林浩于11月10日前提交奖金数据。", py: "Dàibàn shìxiàng: Lín Hào yú shíyī yuè shí rì qián tíjiāo jiǎngjīn shùjù.", vi: "Việc cần làm: Lâm Hạo nộp dữ liệu thưởng trước ngày 10/11.", en: "Action item: Lin Hao submits the bonus data before November 10." }
      ],
      checklist: [
        { vi: "Có đủ thời gian, thành phần và chủ đề.", en: "Includes time, attendees and topic." },
        { vi: "Quyết định viết rõ ràng, dùng 会议决定.", en: "Decision is clear and uses 会议决定." },
        { vi: "Mỗi việc cần làm có người phụ trách và hạn (由……负责, 于……前).", en: "Each action item has an owner and a deadline (由……负责, 于……前)." },
        { vi: "Câu ngắn, khách quan, không có ý kiến cá nhân.", en: "Short, objective sentences with no personal opinions." }
      ]
    }
  ]
},
{
  week: 6, block: "templates",
  title: { zh: "向总部说明与致歉邮件", vi: "Email giải trình và xin lỗi Tổng công ty", en: "Explanation and apology email to HQ" },
  goal: { vi: "Viết email giải trình sự cố gửi Tổng công ty: nêu sự việc, xin lỗi, đã xử lý thế nào và cách phòng ngừa.", en: "Write an incident email to HQ: what happened, apology, what was done and how to prevent a repeat." },
  sessions: [
    {
      kind: "model",
      title: { zh: "范文：关于九月工资延迟发放的说明与致歉", vi: "Mẫu: giải trình và xin lỗi việc trả lương tháng 9 chậm", en: "Model: explanation and apology for the late September payroll" },
      scenario: { vi: "Do lỗi hệ thống ngân hàng, lương tháng 9 trả chậm một ngày. Chị Nguyễn gửi email giải trình cho Giám đốc Nhân sự Tổng công ty, ông Lý.", en: "A bank system fault delayed September pay by one day. Ms. Nguyen emails the HQ HR director, Mr. Li, an explanation." },
      text: [
        { zh: "主题：关于九月工资延迟发放的说明与致歉", py: "Zhǔtí: guānyú jiǔ yuè gōngzī yánchí fāfàng de shuōmíng yǔ zhìqiàn", vi: "Tiêu đề: giải trình và xin lỗi về việc trả lương tháng 9 chậm", en: "Subject: explanation and apology regarding the delayed September payroll" },
        { zh: "李总监您好：", py: "Lǐ zǒngjiān nín hǎo:", vi: "Kính chào Giám đốc Lý,", en: "Dear Director Li," },
        { zh: "越南公司九月份工资原定于10月5日发放，因银行系统故障，实际延迟了一天。", py: "Yuènán gōngsī jiǔ yuèfèn gōngzī yuándìng yú shí yuè wǔ rì fāfàng, yīn yínháng xìtǒng gùzhàng, shíjì yánchí le yī tiān.", vi: "Lương tháng 9 của công ty Việt Nam dự kiến trả ngày 5/10, do hệ thống ngân hàng gặp sự cố nên thực tế chậm một ngày.", en: "The Vietnam company's September salary was scheduled for October 5, but because of a bank system fault it was actually one day late." },
        { zh: "对此给总部造成的困扰，我们深表歉意。", py: "Duì cǐ gěi zǒngbù zàochéng de kùnrǎo, wǒmen shēn biǎo qiànyì.", vi: "Về sự phiền hà này đối với Tổng công ty, chúng tôi xin thành thật xin lỗi.", en: "We sincerely apologize for the inconvenience this caused to HQ." },
        { zh: "事件发生后，我们第一时间通知了全体员工，并在10月6日上午完成发放。", py: "Shìjiàn fāshēng hòu, wǒmen dì yī shíjiān tōngzhī le quántǐ yuángōng, bìng zài shí yuè liù rì shàngwǔ wánchéng fāfàng.", vi: "Sau khi sự việc xảy ra, chúng tôi đã thông báo ngay cho toàn thể nhân viên và hoàn tất chi trả vào sáng ngày 6/10.", en: "After the incident, we immediately notified all employees and completed the payment on the morning of October 6." },
        { zh: "为避免类似情况再次发生，我们已与银行确认，今后将提前两天提交付款申请。", py: "Wèi bìmiǎn lèisì qíngkuàng zàicì fāshēng, wǒmen yǐ yǔ yínháng quèrèn, jīnhòu jiāng tíqián liǎng tiān tíjiāo fùkuǎn shēnqǐng.", vi: "Để tránh tình huống tương tự tái diễn, chúng tôi đã xác nhận với ngân hàng và từ nay sẽ nộp lệnh thanh toán sớm hai ngày.", en: "To prevent a similar situation from happening again, we have confirmed with the bank and will submit payment requests two days earlier from now on." },
        { zh: "附件是详细的情况说明，请您查阅。", py: "Fùjiàn shì xiángxì de qíngkuàng shuōmíng, qǐng nín cháyuè.", vi: "Tệp đính kèm là bản giải trình chi tiết, xin ông xem qua.", en: "The attachment is a detailed explanation; please take a look." },
        { zh: "如需进一步了解情况，我们随时向您汇报。", py: "Rú xū jìnyībù liǎojiě qíngkuàng, wǒmen suíshí xiàng nín huìbào.", vi: "Nếu ông cần tìm hiểu thêm, chúng tôi sẵn sàng báo cáo bất cứ lúc nào.", en: "If you need to know more, we can report to you at any time." },
        { zh: "感谢您的理解与支持。", py: "Gǎnxiè nín de lǐjiě yǔ zhīchí.", vi: "Cảm ơn sự thông cảm và hỗ trợ của ông.", en: "Thank you for your understanding and support." }
      ],
      phrases: [
        { zh: "关于……的说明与致歉", py: "guānyú ... de shuōmíng yǔ zhìqiàn", vi: "giải trình và xin lỗi về ...", en: "explanation and apology regarding ..." },
        { zh: "原定于……，实际延迟了……", py: "yuándìng yú ..., shíjì yánchí le ...", vi: "dự kiến ..., thực tế chậm ...", en: "was scheduled for ..., actually delayed by ..." },
        { zh: "我们深表歉意", py: "wǒmen shēn biǎo qiànyì", vi: "chúng tôi xin thành thật xin lỗi", en: "we sincerely apologize" },
        { zh: "第一时间通知", py: "dì yī shíjiān tōngzhī", vi: "thông báo ngay lập tức", en: "notify immediately" },
        { zh: "为避免……再次发生", py: "wèi bìmiǎn ... zàicì fāshēng", vi: "để tránh ... tái diễn", en: "to prevent ... from happening again" },
        { zh: "如需……，随时向您汇报", py: "rú xū ..., suíshí xiàng nín huìbào", vi: "nếu cần ..., sẵn sàng báo cáo bất cứ lúc nào", en: "if you need ..., we can report to you any time" }
      ]
    },
    {
      kind: "fill",
      items: [
        { zh: "对此造成的困扰，我们深表___。", answer: "歉意", options: ["歉意", "手续", "故障", "附件"], vi: "Về sự phiền hà này, chúng tôi xin thành thật xin lỗi.", en: "We sincerely apologize for the inconvenience this caused." },
        { zh: "因银行系统___，工资延迟了一天。", answer: "故障", options: ["故障", "歉意", "附件", "汇报"], vi: "Do hệ thống ngân hàng gặp sự cố, lương bị chậm một ngày.", en: "Because of a bank system fault, the salary was one day late." },
        { zh: "我们第一时间___了全体员工。", answer: "通知", options: ["通知", "延迟", "避免", "查阅"], vi: "Chúng tôi đã thông báo ngay cho toàn thể nhân viên.", en: "We immediately notified all employees." },
        { zh: "为___类似情况再次发生，我们已调整流程。", answer: "避免", options: ["避免", "造成", "延迟", "通知"], vi: "Để tránh tình huống tương tự tái diễn, chúng tôi đã điều chỉnh quy trình.", en: "To prevent a similar situation from recurring, we have adjusted the process." },
        { zh: "详细情况请见___。", answer: "附件", options: ["附件", "歉意", "故障", "困扰"], vi: "Tình hình chi tiết xin xem tệp đính kèm.", en: "For details, please see the attachment." },
        { zh: "如需了解更多情况，我们随时向您___。", answer: "汇报", options: ["汇报", "避免", "延迟", "造成"], vi: "Nếu cần biết thêm, chúng tôi sẵn sàng báo cáo bất cứ lúc nào.", en: "If you need to know more, we can report to you at any time." }
      ]
    },
    {
      kind: "write",
      prompt: { vi: "Viết email ngắn gửi Giám đốc Lý ở Tổng công ty: báo cáo nhân sự tháng 9 dự kiến nộp ngày 3/10 nhưng chậm hai ngày do lỗi hệ thống. Xin lỗi, nêu biện pháp phòng ngừa và nhắc tệp đính kèm. Dài 4-5 câu.", en: "Write a short email to Director Li at HQ: the September HR report was due October 3 but was two days late because of a system fault. Apologize, give a preventive measure and mention the attachment. 4-5 sentences." },
      mustUse: ["延迟", "深表歉意", "避免", "附件"],
      sample: [
        { zh: "主题：关于人事月报延迟提交的说明与致歉", py: "Zhǔtí: guānyú rénshì yuèbào yánchí tíjiāo de shuōmíng yǔ zhìqiàn", vi: "Tiêu đề: giải trình và xin lỗi về việc nộp báo cáo nhân sự tháng chậm", en: "Subject: explanation and apology regarding the late HR monthly report" },
        { zh: "李总监您好：", py: "Lǐ zǒngjiān nín hǎo:", vi: "Kính chào Giám đốc Lý,", en: "Dear Director Li," },
        { zh: "九月人事月报原定于10月3日提交，因系统故障，实际延迟了两天，我们深表歉意。", py: "Jiǔ yuè rénshì yuèbào yuándìng yú shí yuè sān rì tíjiāo, yīn xìtǒng gùzhàng, shíjì yánchí le liǎng tiān, wǒmen shēn biǎo qiànyì.", vi: "Báo cáo nhân sự tháng 9 dự kiến nộp ngày 3/10, do lỗi hệ thống nên thực tế chậm hai ngày, chúng tôi xin thành thật xin lỗi.", en: "The September HR monthly report was due on October 3 but, because of a system fault, was two days late. We sincerely apologize." },
        { zh: "为避免再次发生，今后我们将提前一周准备数据。", py: "Wèi bìmiǎn zàicì fāshēng, jīnhòu wǒmen jiāng tíqián yī zhōu zhǔnbèi shùjù.", vi: "Để tránh tái diễn, từ nay chúng tôi sẽ chuẩn bị dữ liệu sớm một tuần.", en: "To prevent a recurrence, we will prepare the data one week earlier from now on." },
        { zh: "详细说明见附件，感谢您的理解。", py: "Xiángxì shuōmíng jiàn fùjiàn, gǎnxiè nín de lǐjiě.", vi: "Giải trình chi tiết xem tệp đính kèm, cảm ơn sự thông cảm của ông.", en: "The detailed explanation is in the attachment. Thank you for your understanding." }
      ],
      checklist: [
        { vi: "Tiêu đề rõ ràng, dạng 关于……的说明与致歉.", en: "Clear subject line in the form 关于……的说明与致歉." },
        { vi: "Nêu sự việc và nguyên nhân ngắn gọn, không viện cớ dài dòng.", en: "States the incident and cause briefly, without long excuses." },
        { vi: "Xin lỗi một lần, trang trọng (深表歉意).", en: "Apologizes once, formally (深表歉意)." },
        { vi: "Có biện pháp phòng ngừa cụ thể và nhắc tệp đính kèm.", en: "Gives a concrete preventive measure and mentions the attachment." }
      ]
    }
  ]
}
);
