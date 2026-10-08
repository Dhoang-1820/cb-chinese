/* Role-play scenes shown in the app (titles, the learner's goal, the company rules card, and an offline opening line).
   The server keeps its own copy of each scene for the AI (supabase/functions/ai/index.ts, ROLEPLAY_SCENES), including a
   hidden twist the learner does not see. tools/ai_function_test.mjs checks that the ids and the English rules match. */
(function () {
  "use strict";
  window.CB_TALK = [
    { id: "payslip", group: "daily", icon: "🧾",
      t: { en: "Explain a payslip", vi: "Giải thích phiếu lương" },
      d: { en: "An employee's take-home pay dropped and they want to know why", vi: "Lương thực nhận của nhân viên giảm, họ muốn biết lý do" },
      goal: { en: "Find out what changed, explain it with the rules, and fix it if HR made a mistake.", vi: "Tìm ra điều gì đã thay đổi, giải thích theo quy định, và sửa nếu HR làm sai." },
      rules: [
        { en: "Employees pay 10.5% of their insurance salary: 8% social, 1.5% health, 1% unemployment insurance.", vi: "Nhân viên đóng 10,5% lương đóng bảo hiểm: 8% BHXH, 1,5% BHYT, 1% BHTN." },
        { en: "Personal income tax is withheld every month; a bonus is taxed in the month it is paid.", vi: "Thuế TNCN được khấu trừ hằng tháng; tiền thưởng chịu thuế trong tháng được trả." },
        { en: "An unpaid leave day is deducted at monthly salary ÷ 26.", vi: "Một ngày nghỉ không lương bị trừ theo lương tháng ÷ 26." },
        { en: "Payroll errors are corrected in the next pay run, or within 5 working days if the employee asks.", vi: "Sai sót tính lương được điều chỉnh vào kỳ lương sau, hoặc trong 5 ngày làm việc nếu nhân viên yêu cầu." }
      ],
      open: { zh: "你好，我这个月的工资怎么少了这么多？我看不懂工资条上的扣款。", py: "Nǐ hǎo, wǒ zhège yuè de gōngzī zěnme shǎole zhème duō? Wǒ kàn bu dǒng gōngzītiáo shàng de kòukuǎn.", en: "Hi, why is my pay so much lower this month? I don't understand the deductions on my payslip.", vi: "Chào chị, sao lương tháng này của em ít đi nhiều thế? Em không hiểu các khoản trừ trên phiếu lương." } },
    { id: "leave", group: "daily", icon: "🏖️",
      t: { en: "Annual leave request", vi: "Xin nghỉ phép năm" },
      d: { en: "An employee wants time off that does not fit the rules", vi: "Nhân viên muốn nghỉ nhưng không đúng quy định" },
      goal: { en: "Apply the leave rules correctly and offer a workable alternative.", vi: "Áp dụng đúng quy định nghỉ phép và đưa ra phương án khả thi." },
      rules: [
        { en: "Full-time staff get 12 days of annual leave a year, plus 1 day for every 5 years of service.", vi: "Nhân viên toàn thời gian có 12 ngày phép năm, cộng thêm 1 ngày cho mỗi 5 năm làm việc." },
        { en: "Up to 5 unused days can be carried over, and must be used by 31 March.", vi: "Được chuyển tối đa 5 ngày chưa nghỉ sang năm sau, phải dùng trước 31/3." },
        { en: "Leave must be requested at least 3 working days ahead and approved by the manager.", vi: "Phải xin nghỉ trước ít nhất 3 ngày làm việc và được quản lý duyệt." },
        { en: "Sick leave longer than 1 day needs a doctor's note.", vi: "Nghỉ ốm trên 1 ngày cần giấy của bác sĩ." }
      ],
      open: { zh: "请问，我明天想请三天假，可以吗？家里有点儿急事。", py: "Qǐngwèn, wǒ míngtiān xiǎng qǐng sān tiān jià, kěyǐ ma? Jiā lǐ yǒu diǎnr jíshì.", en: "Excuse me, can I take three days off starting tomorrow? Something urgent came up at home.", vi: "Cho em hỏi, từ mai em muốn nghỉ ba ngày được không? Nhà em có việc gấp." } },
    { id: "offer", group: "daily", icon: "💼",
      t: { en: "Job offer negotiation", vi: "Đàm phán thư mời làm việc" },
      d: { en: "A strong candidate pushes for a better offer", vi: "Ứng viên giỏi muốn thư mời tốt hơn" },
      goal: { en: "Explain the offer clearly and close the deal inside the salary range.", vi: "Giải thích rõ thư mời và chốt được trong khung lương." },
      rules: [
        { en: "Salary range for this role: 18 to 22 million VND gross a month.", vi: "Khung lương vị trí này: 18 đến 22 triệu đồng gross mỗi tháng." },
        { en: "A 13th-month salary is paid after a full year of work.", vi: "Lương tháng 13 được trả khi làm đủ một năm." },
        { en: "Probation is 2 months at 85% of salary.", vi: "Thử việc 2 tháng, hưởng 85% lương." },
        { en: "Private health insurance from day one; work from home 2 days a week after probation.", vi: "Bảo hiểm sức khỏe tư nhân từ ngày đầu; làm việc tại nhà 2 ngày/tuần sau thử việc." }
      ],
      open: { zh: "谢谢您的邀请。不过我想先了解清楚，这个职位的工资是税前还是税后？", py: "Xièxie nín de yāoqǐng. Búguò wǒ xiǎng xiān liǎojiě qīngchu, zhège zhíwèi de gōngzī shì shuì qián háishi shuì hòu?", en: "Thank you for the offer. But first I'd like to be clear: is the salary for this role before or after tax?", vi: "Cảm ơn anh chị đã mời. Nhưng em muốn hỏi rõ trước, lương vị trí này là trước thuế hay sau thuế?" } },
    { id: "review", group: "daily", icon: "📊",
      t: { en: "Performance rating dispute", vi: "Khiếu nại kết quả đánh giá" },
      d: { en: "An employee is unhappy with a B rating and the bonus", vi: "Nhân viên không hài lòng với điểm B và tiền thưởng" },
      goal: { en: "Explain how ratings and bonuses work and the correct way to appeal.", vi: "Giải thích cách xếp loại, thưởng và cách khiếu nại đúng quy trình." },
      rules: [
        { en: "Year-end bonus: rating A = 2 months' salary, B = 1 month, C = half a month.", vi: "Thưởng cuối năm: loại A = 2 tháng lương, B = 1 tháng, C = nửa tháng." },
        { en: "Ratings are calibrated across the department; at most 20% of staff can get an A.", vi: "Kết quả được cân chỉnh trong toàn phòng; tối đa 20% nhân viên được loại A." },
        { en: "An appeal must be made in writing within 10 working days of the result.", vi: "Khiếu nại phải làm bằng văn bản trong vòng 10 ngày làm việc kể từ khi có kết quả." },
        { en: "Appeals are reviewed by HR and the manager's manager.", vi: "Khiếu nại được HR và cấp trên của quản lý xem xét." }
      ],
      open: { zh: "我这次绩效只拿了B，我觉得太不公平了。我今年做了那么多项目！", py: "Wǒ zhè cì jìxiào zhǐ nále B, wǒ juéde tài bù gōngpíng le. Wǒ jīnnián zuòle nàme duō xiàngmù!", en: "I only got a B this time. I think it's really unfair. I did so many projects this year!", vi: "Lần này em chỉ được B, em thấy quá bất công. Năm nay em làm bao nhiêu dự án!" } },
    { id: "insurance", group: "daily", icon: "🏥",
      t: { en: "Social insurance questions", vi: "Hỏi về bảo hiểm xã hội" },
      d: { en: "An employee wants to change how their insurance works", vi: "Nhân viên muốn thay đổi việc đóng bảo hiểm" },
      goal: { en: "Explain contributions and benefits correctly, and say no politely where the rules require it.", vi: "Giải thích đúng mức đóng và quyền lợi, và từ chối khéo khi quy định không cho phép." },
      rules: [
        { en: "The employee pays 10.5% and the company pays 21.5% of the insurance salary.", vi: "Nhân viên đóng 10,5% và công ty đóng 21,5% lương đóng bảo hiểm." },
        { en: "Insurance is compulsory for contracts of 1 month or longer; it cannot be swapped for cash.", vi: "Bảo hiểm là bắt buộc với hợp đồng từ 1 tháng trở lên; không thể đổi thành tiền mặt." },
        { en: "Contributions count toward pension, sickness, maternity and unemployment benefits.", vi: "Tiền đóng được tính cho lương hưu, ốm đau, thai sản và trợ cấp thất nghiệp." },
        { en: "HR updates the insurance salary every January based on the contract salary.", vi: "HR cập nhật lương đóng bảo hiểm vào tháng 1 hằng năm theo lương hợp đồng." }
      ],
      open: { zh: "我想问一下，社保能不能不交？我宁可每个月多拿点儿现金。", py: "Wǒ xiǎng wèn yíxià, shèbǎo néng bu néng bù jiāo? Wǒ nìngkě měi ge yuè duō ná diǎnr xiànjīn.", en: "Can I ask: is it possible not to pay social insurance? I'd rather take a bit more cash each month.", vi: "Em muốn hỏi, có thể không đóng bảo hiểm xã hội được không? Em thà mỗi tháng nhận thêm chút tiền mặt." } },
    { id: "overtime", group: "law", icon: "⏰",
      t: { en: "Overtime pay complaint", vi: "Khiếu nại lương làm thêm giờ" },
      d: { en: "An employee says overtime was paid wrongly", vi: "Nhân viên cho rằng lương làm thêm bị tính sai" },
      goal: { en: "Check the overtime against the rules, explain the rate, and agree what happens next.", vi: "Đối chiếu giờ làm thêm với quy định, giải thích hệ số và thống nhất bước tiếp theo." },
      rules: [
        { en: "Overtime is paid at 150% on working days, 200% on weekly rest days and 300% on public holidays.", vi: "Làm thêm được trả 150% vào ngày thường, 200% vào ngày nghỉ hằng tuần và 300% vào ngày lễ." },
        { en: "Overtime must be approved by the manager in advance.", vi: "Làm thêm phải được quản lý duyệt trước." },
        { en: "Maximum 40 hours of overtime a month.", vi: "Tối đa 40 giờ làm thêm mỗi tháng." },
        { en: "Instead of pay, the employee may choose time off in lieu, agreed in writing.", vi: "Thay vì nhận tiền, nhân viên có thể chọn nghỉ bù, thỏa thuận bằng văn bản." }
      ],
      open: { zh: "上个周日我加了八个小时班，可是工资条上只按一点五倍算的，这不对吧？", py: "Shàng ge zhōurì wǒ jiāle bā ge xiǎoshí bān, kěshì gōngzītiáo shàng zhǐ àn yī diǎn wǔ bèi suàn de, zhè bú duì ba?", en: "I worked eight hours of overtime last Sunday, but the payslip only counts it at 1.5 times. That isn't right, is it?", vi: "Chủ nhật tuần trước em làm thêm tám tiếng, nhưng phiếu lương chỉ tính gấp 1,5 lần, thế là sai phải không?" } },
    { id: "probation", group: "law", icon: "📝",
      t: { en: "Ending a probation", vi: "Chấm dứt thử việc" },
      d: { en: "A manager wants to let a new hire go", vi: "Quản lý muốn cho nhân viên mới nghỉ việc" },
      goal: { en: "Make sure the manager follows the probation rules before anything is done.", vi: "Đảm bảo quản lý làm đúng quy định thử việc trước khi quyết định." },
      rules: [
        { en: "Probation lasts at most 60 days for this role.", vi: "Thời gian thử việc của vị trí này tối đa 60 ngày." },
        { en: "During probation either side may end it with 3 working days' written notice.", vi: "Trong thời gian thử việc, mỗi bên có thể chấm dứt với thông báo bằng văn bản trước 3 ngày làm việc." },
        { en: "The manager must give a written evaluation with reasons.", vi: "Quản lý phải có bản đánh giá bằng văn bản nêu rõ lý do." },
        { en: "All days worked are paid; after probation ends, normal contract termination rules apply.", vi: "Mọi ngày đã làm đều được trả lương; sau khi hết thử việc, áp dụng quy định chấm dứt hợp đồng thông thường." }
      ],
      open: { zh: "我们部门新来的小李不太合适，我想让他今天就走。你帮我办一下吧。", py: "Wǒmen bùmén xīn lái de Xiǎo Lǐ bú tài héshì, wǒ xiǎng ràng tā jīntiān jiù zǒu. Nǐ bāng wǒ bàn yíxià ba.", en: "Xiao Li, the new hire in my department, isn't a good fit. I want him gone today. Please handle it for me.", vi: "Cậu Lý mới vào phòng tôi không phù hợp lắm, tôi muốn cậu ấy nghỉ ngay hôm nay. Em làm giúp tôi nhé." } },
    { id: "resign", group: "law", icon: "🚪",
      t: { en: "Resignation and final pay", vi: "Nghỉ việc và quyết toán" },
      d: { en: "An employee wants to leave fast", vi: "Nhân viên muốn nghỉ việc gấp" },
      goal: { en: "Explain notice, final pay and handover, and agree on a last working day.", vi: "Giải thích thời hạn báo trước, quyết toán, bàn giao và thống nhất ngày làm việc cuối." },
      rules: [
        { en: "Notice period: 30 days for a fixed-term contract, 45 days for an indefinite contract.", vi: "Thời hạn báo trước: 30 ngày với hợp đồng xác định thời hạn, 45 ngày với hợp đồng không xác định thời hạn." },
        { en: "Unused annual leave is paid out with the final salary.", vi: "Ngày phép năm chưa nghỉ được thanh toán cùng lương cuối." },
        { en: "Final pay is made within 14 days after the last working day.", vi: "Quyết toán lương trong vòng 14 ngày sau ngày làm việc cuối cùng." },
        { en: "Company laptop and badge must be returned; a shorter notice needs the manager's written agreement.", vi: "Phải trả laptop và thẻ công ty; muốn báo trước ngắn hơn cần quản lý đồng ý bằng văn bản." }
      ],
      open: { zh: "我已经决定辞职了，下周五是我最后一天，可以吗？", py: "Wǒ yǐjīng juédìng cízhí le, xià zhōuwǔ shì wǒ zuìhòu yì tiān, kěyǐ ma?", en: "I've decided to resign. Next Friday will be my last day. Is that OK?", vi: "Em đã quyết định nghỉ việc rồi, thứ Sáu tuần sau là ngày cuối của em, được không ạ?" } },
    { id: "raise", group: "law", icon: "📈",
      t: { en: "Pay raise request", vi: "Đề nghị tăng lương" },
      d: { en: "An employee asks for a raise outside the review cycle", vi: "Nhân viên xin tăng lương ngoài kỳ xét" },
      goal: { en: "Explain the salary review policy and agree on a fair next step.", vi: "Giải thích chính sách xét lương và thống nhất bước tiếp theo hợp lý." },
      rules: [
        { en: "Salaries are reviewed once a year in April; this year's budget is 6 to 8%.", vi: "Lương được xét mỗi năm một lần vào tháng 4; ngân sách năm nay là 6 đến 8%." },
        { en: "A raise outside April needs a promotion or a market gap above 15%, with data.", vi: "Tăng lương ngoài tháng 4 cần có thăng chức hoặc chênh lệch thị trường trên 15%, có số liệu." },
        { en: "Requests go through the manager first, then HR.", vi: "Đề nghị phải qua quản lý trước, sau đó đến HR." },
        { en: "Salary information is confidential; staff may not compare named colleagues' pay.", vi: "Thông tin lương là bảo mật; nhân viên không được so sánh lương của đồng nghiệp cụ thể." }
      ],
      open: { zh: "我在公司干了三年了，工资一直没怎么涨。我想申请加薪。", py: "Wǒ zài gōngsī gànle sān nián le, gōngzī yìzhí méi zěnme zhǎng. Wǒ xiǎng shēnqǐng jiāxīn.", en: "I've worked here for three years and my salary has hardly gone up. I want to ask for a raise.", vi: "Em làm ở công ty ba năm rồi, lương gần như không tăng. Em muốn xin tăng lương." } },
    { id: "maternity", group: "law", icon: "🍼",
      t: { en: "Maternity leave", vi: "Nghỉ thai sản" },
      d: { en: "A pregnant employee is worried about her job and pay", vi: "Nhân viên mang thai lo lắng về công việc và thu nhập" },
      goal: { en: "Explain her rights and the process, and reassure her with the facts.", vi: "Giải thích quyền lợi, thủ tục và trấn an bằng thông tin chính xác." },
      rules: [
        { en: "Maternity leave is 6 months, paid by social insurance if she paid in for at least 6 of the last 12 months.", vi: "Nghỉ thai sản 6 tháng, do BHXH chi trả nếu đã đóng ít nhất 6 trong 12 tháng gần nhất." },
        { en: "An employee cannot be dismissed or have her pay cut because she is pregnant.", vi: "Không được sa thải hay cắt lương vì nhân viên mang thai." },
        { en: "She returns to the same job, or an equal one, at the same salary.", vi: "Khi quay lại, được làm công việc cũ hoặc tương đương với mức lương như cũ." },
        { en: "Fathers get 5 working days of paternity leave; the year-end bonus is prorated for time worked.", vi: "Người cha được nghỉ 5 ngày làm việc; thưởng cuối năm tính theo thời gian làm việc thực tế." }
      ],
      open: { zh: "我怀孕了，可是我有点儿担心，休产假会不会影响我的工作？", py: "Wǒ huáiyùn le, kěshì wǒ yǒu diǎnr dānxīn, xiū chǎnjià huì bu huì yǐngxiǎng wǒ de gōngzuò?", en: "I'm pregnant, but I'm a bit worried. Will taking maternity leave affect my job?", vi: "Em có thai rồi, nhưng em hơi lo, nghỉ thai sản có ảnh hưởng đến công việc của em không?" } },
    { id: "expenses", group: "daily", icon: "🧳",
      t: {"en": "Business trip expenses", "vi": "Chi phí công tác"},
      d: {"en": "An employee's travel claim does not match the policy", "vi": "Đề nghị thanh toán công tác của nhân viên không khớp chính sách"},
      goal: {"en": "Check the claim against the policy, explain what can be paid, and agree what to fix.", "vi": "Đối chiếu đề nghị với chính sách, giải thích khoản nào được thanh toán và thống nhất cần sửa gì."},
      rules: [
        { en: "Hotels up to 1.2 million VND a night in big cities, 800,000 elsewhere.", vi: "Khách sạn tối đa 1,2 triệu đồng/đêm ở thành phố lớn, 800.000 đồng ở nơi khác." },
        { en: "Daily allowance of 300,000 VND covers meals; no meal receipts needed.", vi: "Phụ cấp 300.000 đồng/ngày cho ăn uống; không cần hóa đơn ăn uống." },
        { en: "Claims need official VAT invoices and must be submitted within 30 days of the trip.", vi: "Đề nghị thanh toán cần hóa đơn VAT hợp lệ và nộp trong vòng 30 ngày sau chuyến đi." },
        { en: "Taxis are allowed for business; private trips and family costs are not covered.", vi: "Được đi taxi cho công việc; chuyến đi cá nhân và chi phí gia đình không được thanh toán." }
      ],
      open: {"zh": "我上个月出差的报销怎么被退回来了？我都按时交了啊。", "py": "Wǒ shàng ge yuè chūchāi de bàoxiāo zěnme bèi tuì huílai le? Wǒ dōu ànshí jiāo le a.", "en": "Why was my business trip claim from last month sent back? I handed it in on time.", "vi": "Sao đề nghị thanh toán công tác tháng trước của em bị trả lại? Em nộp đúng hạn mà."} },
    { id: "training", group: "daily", icon: "🎓",
      t: {"en": "Training sponsorship", "vi": "Tài trợ đào tạo"},
      d: {"en": "An employee wants the company to pay for a course", "vi": "Nhân viên muốn công ty trả tiền khóa học"},
      goal: {"en": "Explain the training policy, the service commitment, and help the employee apply.", "vi": "Giải thích chính sách đào tạo, cam kết làm việc và giúp nhân viên đăng ký."},
      rules: [
        { en: "The company pays up to 30 million VND a year per employee for job-related training.", vi: "Công ty chi tối đa 30 triệu đồng/năm/nhân viên cho đào tạo liên quan công việc." },
        { en: "Courses above 15 million need a service commitment of 1 year after the course.", vi: "Khóa học trên 15 triệu cần cam kết làm việc 1 năm sau khóa học." },
        { en: "If the employee leaves early, they repay the cost in proportion to the months left.", vi: "Nếu nghỉ việc sớm, nhân viên hoàn trả chi phí theo số tháng còn lại." },
        { en: "Applications need the manager's approval and must be sent before the course starts.", vi: "Đơn cần quản lý duyệt và phải gửi trước khi khóa học bắt đầu." }
      ],
      open: {"zh": "我报了一个HSK五级的培训班，公司能帮我出学费吗？", "py": "Wǒ bàole yí ge HSK wǔ jí de péixùnbān, gōngsī néng bāng wǒ chū xuéfèi ma?", "en": "I've signed up for an HSK 5 course. Can the company pay the fees for me?", "vi": "Em đã đăng ký một lớp HSK 5, công ty có thể trả học phí giúp em không?"} },
    { id: "remote", group: "daily", icon: "🏠",
      t: {"en": "Working from home", "vi": "Làm việc tại nhà"},
      d: {"en": "An employee asks for more remote work", "vi": "Nhân viên xin làm việc từ xa nhiều hơn"},
      goal: {"en": "Explain the hybrid policy, understand the reason, and find a fair arrangement.", "vi": "Giải thích chính sách làm việc kết hợp, hiểu lý do và tìm phương án hợp lý."},
      rules: [
        { en: "Staff may work from home up to 2 days a week after probation.", vi: "Sau thử việc, nhân viên được làm việc tại nhà tối đa 2 ngày/tuần." },
        { en: "Core hours are 10:00 to 16:00; staff must be reachable online.", vi: "Giờ cốt lõi là 10:00 đến 16:00; nhân viên phải liên lạc được trực tuyến." },
        { en: "More remote days need the manager's and HR's written approval, for up to 3 months.", vi: "Làm từ xa nhiều hơn cần quản lý và HR duyệt bằng văn bản, tối đa 3 tháng." },
        { en: "Health or family reasons are considered first; documents may be requested.", vi: "Lý do sức khỏe hoặc gia đình được ưu tiên xem xét; có thể yêu cầu giấy tờ." }
      ],
      open: {"zh": "最近我家里有点儿情况，我想每周在家办公四天，可以吗？", "py": "Zuìjìn wǒ jiā lǐ yǒu diǎnr qíngkuàng, wǒ xiǎng měi zhōu zài jiā bàngōng sì tiān, kěyǐ ma?", "en": "Something has come up at home recently. Could I work from home four days a week?", "vi": "Gần đây nhà em có chút chuyện, em muốn mỗi tuần làm việc ở nhà bốn ngày, được không ạ?"} },
    { id: "conflict", group: "daily", icon: "⚡",
      t: {"en": "Conflict in a team", "vi": "Mâu thuẫn trong nhóm"},
      d: {"en": "An employee complains about a colleague", "vi": "Nhân viên phàn nàn về đồng nghiệp"},
      goal: {"en": "Listen, keep it fair and confidential, and agree on the next step.", "vi": "Lắng nghe, giữ công bằng và bảo mật, thống nhất bước tiếp theo."},
      rules: [
        { en: "Complaints are handled confidentially; only the people involved are told.", vi: "Khiếu nại được xử lý bảo mật; chỉ những người liên quan được biết." },
        { en: "HR hears both sides before deciding anything.", vi: "HR nghe cả hai bên trước khi quyết định." },
        { en: "Serious cases (harassment, threats) are investigated within 10 working days.", vi: "Trường hợp nghiêm trọng (quấy rối, đe dọa) được điều tra trong vòng 10 ngày làm việc." },
        { en: "No one may be punished for raising a complaint in good faith.", vi: "Không ai bị phạt vì đã khiếu nại một cách thiện chí." }
      ],
      open: {"zh": "我真的受不了我们组的老王了，他总是把他的工作推给我。", "py": "Wǒ zhēn de shòu bu liǎo wǒmen zǔ de Lǎo Wáng le, tā zǒngshì bǎ tā de gōngzuò tuī gěi wǒ.", "en": "I really can't stand Lao Wang in my team any more. He always pushes his work onto me.", "vi": "Em thật sự chịu hết nổi anh Vương trong nhóm rồi, anh ấy toàn đẩy việc của mình cho em."} },
    { id: "accident", group: "law", icon: "🩹",
      t: {"en": "Work injury", "vi": "Tai nạn lao động"},
      d: {"en": "An employee was hurt on the way to work", "vi": "Nhân viên bị thương trên đường đi làm"},
      goal: {"en": "Explain what counts as a work accident, the documents, and the benefits.", "vi": "Giải thích thế nào là tai nạn lao động, giấy tờ cần có và quyền lợi."},
      rules: [
        { en: "An accident on the usual route to or from work, at a reasonable time, counts as a work accident.", vi: "Tai nạn trên tuyến đường đi làm và về thường ngày, trong thời gian hợp lý, được tính là tai nạn lao động." },
        { en: "It must be reported to HR within 24 hours, with a police or hospital record.", vi: "Phải báo cho HR trong vòng 24 giờ, kèm biên bản của công an hoặc bệnh viện." },
        { en: "The company pays medical costs not covered by health insurance and full salary during treatment.", vi: "Công ty trả chi phí y tế ngoài phần bảo hiểm y tế chi trả và trả đủ lương trong thời gian điều trị." },
        { en: "Accidents caused by drinking alcohol or breaking traffic law are not covered.", vi: "Tai nạn do uống rượu bia hoặc vi phạm luật giao thông không được tính." }
      ],
      open: {"zh": "昨天早上我骑摩托车上班的路上摔倒了，腿受伤了。这算工伤吗？", "py": "Zuótiān zǎoshang wǒ qí mótuōchē shàngbān de lù shàng shuāidǎo le, tuǐ shòushāng le. Zhè suàn gōngshāng ma?", "en": "Yesterday morning I fell off my motorbike on the way to work and hurt my leg. Does that count as a work injury?", "vi": "Sáng hôm qua em ngã xe máy trên đường đi làm, bị thương ở chân. Như vậy có tính là tai nạn lao động không?"} },
    { id: "freetalk", group: "chat", icon: "☕",
      t: {"en": "Lunch chat with a colleague", "vi": "Trò chuyện giờ trưa với đồng nghiệp"},
      d: {"en": "Small talk with a Chinese colleague, topics change as you go", "vi": "Nói chuyện phiếm với đồng nghiệp người Trung Quốc, chủ đề thay đổi liên tục"},
      goal: {"en": "Keep a natural conversation going for as long as you can: ask questions back and share your own stories.", "vi": "Duy trì cuộc trò chuyện tự nhiên càng lâu càng tốt: hỏi lại và kể chuyện của mình."},
      rules: [
        { en: "Topics you can bring up: weekend plans, food, travel, family, hobbies.", vi: "Chủ đề có thể nói: kế hoạch cuối tuần, đồ ăn, du lịch, gia đình, sở thích." },
        { en: "Work life: workload, a new project, the office, commuting.", vi: "Công việc: khối lượng việc, dự án mới, văn phòng, đi lại." },
        { en: "Culture: differences between Vietnam and China, festivals, learning Chinese.", vi: "Văn hóa: khác biệt Việt Nam và Trung Quốc, lễ hội, học tiếng Trung." },
        { en: "Good habits: ask a follow-up question, give a reason, tell a short story.", vi: "Thói quen tốt: hỏi tiếp, nêu lý do, kể một câu chuyện ngắn." }
      ],
      open: {"zh": "哎，你中午吃什么？我发现公司附近新开了一家越南米粉店。", "py": "Āi, nǐ zhōngwǔ chī shénme? Wǒ fāxiàn gōngsī fùjìn xīn kāile yì jiā Yuènán mǐfěn diàn.", "en": "Hey, what are you having for lunch? I noticed a new Vietnamese pho place opened near the office.", "vi": "Này, trưa nay cậu ăn gì? Mình thấy gần công ty mới mở một quán phở Việt Nam."} }
  ];;
})();
