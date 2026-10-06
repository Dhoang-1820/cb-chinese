window.CB_TRACK = window.CB_TRACK || [];
window.CB_TRACK.push(
{
  "week": 7,
  "block": "roleplay",
  "title": {
    "zh": "与员工谈薪资调整",
    "vi": "Thương lượng điều chỉnh lương với nhân viên",
    "en": "Salary negotiation with an employee"
  },
  "goal": {
    "vi": "Nghe yêu cầu tăng lương của nhân viên, trả lời lịch sự, không hứa quá mức và hẹn thời gian phản hồi.",
    "en": "Listen to an employee's raise request, reply politely without over-promising, and set a date for your answer."
  },
  "sessions": [
    {
      "kind": "prep",
      "scenario": {
        "vi": "Lin Hao, kỹ sư đã làm 2 năm, hẹn gặp bạn để đề nghị tăng lương. Bạn phụ trách C&B của công ty con.",
        "en": "Lin Hao, an engineer with two years at the company, asks to meet you about a raise. You handle C&B at the subsidiary."
      },
      "you": {
        "vi": "Chuyên viên C&B của bộ phận nhân sự",
        "en": "C&B specialist in the HR department"
      },
      "other": {
        "vi": "Lin Hao (林浩), nhân viên đề nghị tăng lương",
        "en": "Lin Hao (林浩), an employee asking for a raise"
      },
      "goal": {
        "vi": "Tìm hiểu mong muốn và lý do của nhân viên, giải thích quy trình xét duyệt, không hứa con số và hẹn ngày trả lời.",
        "en": "Learn what he wants and why, explain the approval process, promise no figure, and agree a reply date."
      },
      "phrases": [
        {
          "zh": "我想跟您谈谈薪资调整的事。",
          "py": "Wǒ xiǎng gēn nín tántan xīnzī tiáozhěng de shì.",
          "vi": "Tôi muốn trao đổi với anh về việc điều chỉnh lương.",
          "en": "I would like to talk with you about a salary adjustment."
        },
        {
          "zh": "您的工作表现我们都看在眼里。",
          "py": "Nín de gōngzuò biǎoxiàn wǒmen dōu kàn zài yǎnlǐ.",
          "vi": "Biểu hiện công việc của anh chúng tôi đều ghi nhận.",
          "en": "We have noticed your work performance."
        },
        {
          "zh": "调薪需要参考岗位级别和市场水平。",
          "py": "Diàoxīn xūyào cānkǎo gǎngwèi jíbié hé shìchǎng shuǐpíng.",
          "vi": "Điều chỉnh lương cần tham khảo cấp bậc vị trí và mặt bằng thị trường.",
          "en": "A raise has to take the job grade and market level into account."
        },
        {
          "zh": "这个幅度还要经过总部审批。",
          "py": "Zhège fúdù hái yào jīngguò zǒngbù shěnpī.",
          "vi": "Mức tăng này còn phải qua phê duyệt của tổng bộ.",
          "en": "The size of the raise still needs HQ approval."
        },
        {
          "zh": "目前预算有限，我们可以考虑其他方式。",
          "py": "Mùqián yùsuàn yǒuxiàn, wǒmen kěyǐ kǎolǜ qítā fāngshì.",
          "vi": "Hiện ngân sách có hạn, chúng tôi có thể cân nhắc cách khác.",
          "en": "The budget is limited for now, but we can consider other options."
        },
        {
          "zh": "您能说说您期望的数字和理由吗？",
          "py": "Nín néng shuōshuo nín qīwàng de shùzì hé lǐyóu ma?",
          "vi": "Anh có thể nói về con số mong muốn và lý do không?",
          "en": "Could you tell me the figure you expect and your reasons?"
        },
        {
          "zh": "我先记下来，下周三之前给您答复。",
          "py": "Wǒ xiān jì xiàlái, xià zhōusān zhīqián gěi nín dáfù.",
          "vi": "Tôi ghi lại trước, trước thứ Tư tuần sau sẽ trả lời anh.",
          "en": "Let me note it down and give you an answer before next Wednesday."
        },
        {
          "zh": "年度绩效评估之后会统一调整。",
          "py": "Niándù jìxiào pínggū zhīhòu huì tǒngyì tiáozhěng.",
          "vi": "Sau đánh giá hiệu suất cuối năm sẽ điều chỉnh chung.",
          "en": "Adjustments are made together after the annual performance review."
        }
      ]
    },
    {
      "kind": "script",
      "turns": [
        {
          "other": {
            "zh": "您好，我来公司两年了，想跟您谈谈涨工资的事。",
            "py": "Nín hǎo, wǒ lái gōngsī liǎng nián le, xiǎng gēn nín tántan zhǎng gōngzī de shì.",
            "vi": "Chào anh/chị, tôi vào công ty được hai năm rồi, muốn trao đổi về việc tăng lương.",
            "en": "Hello, I have been here two years and would like to talk about a raise."
          },
          "choices": [
            {
              "t": {
                "zh": "现在公司没有涨工资的计划，您不用谈了。",
                "py": "Xiànzài gōngsī méiyǒu zhǎng gōngzī de jìhuà, nín bú yòng tán le.",
                "vi": "Hiện công ty không có kế hoạch tăng lương, anh không cần nói nữa.",
                "en": "The company has no plan to raise pay, so there is no need to discuss it."
              },
              "good": false,
              "feedback": {
                "vi": "Quá cộc lốc, chưa nghe lý do đã từ chối và làm nhân viên mất thiện cảm.",
                "en": "Too blunt: it rejects him before hearing his reasons."
              }
            },
            {
              "t": {
                "zh": "好的，请坐。您能先说说期望的调整幅度和理由吗？",
                "py": "Hǎo de, qǐngzuò. Nín néng xiān shuōshuo qīwàng de tiáozhěng fúdù hé lǐyóu ma?",
                "vi": "Vâng, mời anh ngồi. Anh nói trước về mức điều chỉnh mong muốn và lý do được không?",
                "en": "Sure, please sit. Could you first tell me the raise you expect and why?"
              },
              "good": true,
              "feedback": {
                "vi": "Mở đầu lịch sự và hỏi để hiểu rõ nhu cầu trước khi trả lời.",
                "en": "Polite opening that asks for the details before you respond."
              }
            },
            {
              "t": {
                "zh": "涨工资啊，这个以后再说吧。",
                "py": "Zhǎng gōngzī a, zhège yǐhòu zàishuō ba.",
                "vi": "Tăng lương à, để sau hãy nói nhé.",
                "en": "A raise? Let us talk about it later."
              },
              "good": false,
              "feedback": {
                "vi": "Quá mơ hồ, không có thời gian cụ thể nên nhân viên thấy bị gạt đi.",
                "en": "Too vague: no timeline, so he feels brushed off."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "我的工作量比去年多了很多，同级别的同事薪资也比我高。",
            "py": "Wǒ de gōngzuòliàng bǐ qùnián duō le hěn duō, tóng jíbié de tóngshì xīnzī yě bǐ wǒ gāo.",
            "vi": "Khối lượng công việc của tôi nhiều hơn năm ngoái rất nhiều, đồng nghiệp cùng cấp lương cũng cao hơn tôi.",
            "en": "My workload is much larger than last year, and colleagues at the same level earn more than I do."
          },
          "choices": [
            {
              "t": {
                "zh": "别人的工资是保密的，您不应该问这个。",
                "py": "Biérén de gōngzī shì bǎomì de, nín bù yīnggāi wèn zhège.",
                "vi": "Lương người khác là bí mật, anh không nên hỏi điều này.",
                "en": "Other people's pay is confidential; you should not ask about that."
              },
              "good": false,
              "feedback": {
                "vi": "Đúng về bảo mật nhưng giọng phòng thủ, bỏ qua lo lắng của nhân viên.",
                "en": "Right about confidentiality, but defensive and ignores his concern."
              }
            },
            {
              "t": {
                "zh": "我明白。我会先核对您的岗位级别和薪资范围，再看您的绩效记录。",
                "py": "Wǒ míngbái. Wǒ huì xiān héduì nín de gǎngwèi jíbié hé xīnzī fànwéi, zài kàn nín de jìxiào jìlù.",
                "vi": "Tôi hiểu. Tôi sẽ đối chiếu cấp bậc và khung lương của anh, rồi xem hồ sơ hiệu suất.",
                "en": "I understand. I will check your job grade and pay range first, then look at your performance record."
              },
              "good": true,
              "feedback": {
                "vi": "Ghi nhận ý kiến, nêu cách làm cụ thể mà không tiết lộ lương người khác.",
                "en": "Acknowledges his point and names concrete steps without revealing others' pay."
              }
            },
            {
              "t": {
                "zh": "您说得对，那我们肯定给您涨到一样。",
                "py": "Nín shuō de duì, nà wǒmen kěndìng gěi nín zhǎng dào yíyàng.",
                "vi": "Anh nói đúng, vậy chúng tôi chắc chắn tăng cho anh bằng họ.",
                "en": "You are right, so we will definitely raise you to the same level."
              },
              "good": false,
              "feedback": {
                "vi": "Hứa quá mức khi chưa kiểm tra dữ liệu và chưa có phê duyệt.",
                "en": "Over-promises before checking any data or approval."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "那您觉得大概能涨多少？",
            "py": "Nà nín juéde dàgài néng zhǎng duōshǎo?",
            "vi": "Vậy anh/chị thấy khoảng bao nhiêu thì được?",
            "en": "So roughly how much do you think it could be?"
          },
          "choices": [
            {
              "t": {
                "zh": "涨百分之二十没问题，我保证。",
                "py": "Zhǎng bǎifēnzhī èrshí méi wèntí, wǒ bǎozhèng.",
                "vi": "Tăng hai mươi phần trăm không vấn đề gì, tôi đảm bảo.",
                "en": "Twenty percent is no problem, I guarantee it."
              },
              "good": false,
              "feedback": {
                "vi": "Đưa con số và cam kết khi chưa có thẩm quyền, rất rủi ro.",
                "en": "Gives a number and a guarantee without the authority to do so."
              }
            },
            {
              "t": {
                "zh": "不知道，您自己去问总部吧。",
                "py": "Bù zhīdào, nín zìjǐ qù wèn zǒngbù ba.",
                "vi": "Không biết, anh tự đi hỏi tổng bộ đi.",
                "en": "I do not know; go and ask HQ yourself."
              },
              "good": false,
              "feedback": {
                "vi": "Thiếu trách nhiệm và thiếu lịch sự.",
                "en": "Irresponsible and impolite."
              }
            },
            {
              "t": {
                "zh": "具体幅度还要部门经理和总部审批，我现在不能给您确定的数字。",
                "py": "Jùtǐ fúdù hái yào bùmén jīnglǐ hé zǒngbù shěnpī, wǒ xiànzài bù néng gěi nín quèdìng de shùzì.",
                "vi": "Mức cụ thể còn phải do quản lý bộ phận và tổng bộ duyệt, hiện tôi không thể đưa con số chắc chắn.",
                "en": "The exact figure still needs approval from your manager and HQ, so I cannot give you a definite number now."
              },
              "good": true,
              "feedback": {
                "vi": "Trung thực về quy trình, không hứa con số.",
                "en": "Honest about the process and does not promise a number."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "如果今年预算不够，有没有别的办法？",
            "py": "Rúguǒ jīnnián yùsuàn bú gòu, yǒu méiyǒu bié de bànfǎ?",
            "vi": "Nếu năm nay ngân sách không đủ thì có cách nào khác không?",
            "en": "If the budget is not enough this year, is there any other way?"
          },
          "choices": [
            {
              "t": {
                "zh": "预算不够就没有任何办法了。",
                "py": "Yùsuàn bú gòu jiù méiyǒu rènhé bànfǎ le.",
                "vi": "Ngân sách không đủ thì không còn cách nào cả.",
                "en": "If the budget is not enough there is nothing we can do."
              },
              "good": false,
              "feedback": {
                "vi": "Đóng cửa đối thoại, không giúp giữ nhân viên.",
                "en": "Closes the conversation and does nothing to keep him motivated."
              }
            },
            {
              "t": {
                "zh": "有的。比如培训机会、弹性工作安排，或者下一次评估时优先考虑。我们可以一起看看。",
                "py": "Yǒu de. Bǐrú péixùn jīhuì, tánxìng gōngzuò ānpái, huòzhě xià yí cì pínggū shí yōuxiān kǎolǜ. Wǒmen kěyǐ yìqǐ kànkan.",
                "vi": "Có. Ví dụ cơ hội đào tạo, sắp xếp làm việc linh hoạt, hoặc ưu tiên xem xét ở lần đánh giá sau. Ta cùng xem nhé.",
                "en": "Yes, for example training opportunities, flexible working, or priority at the next review. Let us look at them together."
              },
              "good": true,
              "feedback": {
                "vi": "Đưa phương án thay thế thực tế mà không hứa điều chưa chắc.",
                "en": "Offers realistic alternatives without promising what is uncertain."
              }
            },
            {
              "t": {
                "zh": "您要是不满意，可以考虑别的公司。",
                "py": "Nín yàoshì bù mǎnyì, kěyǐ kǎolǜ bié de gōngsī.",
                "vi": "Nếu anh không hài lòng, có thể cân nhắc công ty khác.",
                "en": "If you are unhappy, you can consider other companies."
              },
              "good": false,
              "feedback": {
                "vi": "Mang tính đe dọa, không phù hợp với vai trò nhân sự.",
                "en": "Sounds like a threat; inappropriate for HR."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "好的，那我什么时候能得到答复？",
            "py": "Hǎo de, nà wǒ shénme shíhòu néng dédào dáfù?",
            "vi": "Vâng, vậy khi nào tôi nhận được trả lời?",
            "en": "OK, so when can I expect an answer?"
          },
          "choices": [
            {
              "t": {
                "zh": "我先把您的情况整理好，下周三之前给您答复，好吗？",
                "py": "Wǒ xiān bǎ nín de qíngkuàng zhěnglǐ hǎo, xià zhōusān zhīqián gěi nín dáfù, hǎo ma?",
                "vi": "Tôi sẽ tổng hợp tình hình của anh, trước thứ Tư tuần sau sẽ trả lời, được không?",
                "en": "I will put your case together and answer before next Wednesday, is that all right?"
              },
              "good": true,
              "feedback": {
                "vi": "Có hạn chót rõ ràng và hỏi ý kiến đối phương.",
                "en": "Gives a clear deadline and checks that it suits him."
              }
            },
            {
              "t": {
                "zh": "很快，您等着吧。",
                "py": "Hěn kuài, nín děng zhe ba.",
                "vi": "Sớm thôi, anh cứ chờ đi.",
                "en": "Soon, just wait."
              },
              "good": false,
              "feedback": {
                "vi": "Mơ hồ và hơi thiếu tôn trọng.",
                "en": "Vague and a little disrespectful."
              }
            },
            {
              "t": {
                "zh": "我也不清楚，有消息再通知您。",
                "py": "Wǒ yě bù qīngchǔ, yǒu xiāoxī zài tōngzhī nín.",
                "vi": "Tôi cũng không rõ, có tin sẽ báo anh.",
                "en": "I am not sure either; I will tell you when there is news."
              },
              "good": false,
              "feedback": {
                "vi": "Không có cam kết thời gian nên nhân viên không biết chờ đến bao giờ.",
                "en": "No time commitment, so he does not know how long to wait."
              }
            }
          ]
        }
      ]
    },
    {
      "kind": "free",
      "opener": {
        "zh": "您好，我想跟您谈谈涨工资的事。",
        "py": "Nín hǎo, wǒ xiǎng gēn nín tántan zhǎng gōngzī de shì.",
        "vi": "Chào anh/chị, tôi muốn trao đổi về việc tăng lương.",
        "en": "Hello, I would like to talk about a raise."
      },
      "aiBrief": "Play Lin Hao, an engineer with two years at a Chinese-owned company in Vietnam who politely asks HR for a raise. Use simple business Chinese, give reasons (workload, market pay), push back gently if given vague answers, and accept a clear reply date.",
      "goal": {
        "vi": "Hỏi lý do, giải thích quy trình duyệt, không hứa con số và chốt ngày phản hồi.",
        "en": "Ask his reasons, explain the approval process, promise no number, and fix a reply date."
      },
      "tips": [
        {
          "vi": "Bắt đầu bằng việc ghi nhận công sức của nhân viên rồi mới nói về giới hạn.",
          "en": "Start by acknowledging his effort before mentioning limits."
        },
        {
          "vi": "Dùng 需要审批 hoặc 还要确认 thay vì cam kết con số.",
          "en": "Use 需要审批 or 还要确认 instead of committing to a figure."
        },
        {
          "vi": "Kết thúc bằng một ngày cụ thể, ví dụ 下周三之前.",
          "en": "End with a concrete date such as 下周三之前."
        }
      ]
    }
  ]
},
{
  "week": 8,
  "block": "roleplay",
  "title": {
    "zh": "申诉面谈",
    "vi": "Buổi gặp giải quyết khiếu nại",
    "en": "Grievance meeting"
  },
  "goal": {
    "vi": "Tiếp nhận khiếu nại của nhân viên một cách trung lập: lắng nghe, hỏi bằng chứng, cam kết bảo mật và báo trước các bước xử lý.",
    "en": "Receive an employee's grievance neutrally: listen, ask for evidence, promise confidentiality and explain the next steps."
  },
  "sessions": [
    {
      "kind": "prep",
      "scenario": {
        "vi": "Huang Ling phản ánh rằng ba tháng nay cô thường xuyên làm thêm giờ nhưng chưa được tính tiền làm thêm. Bạn là người nhân sự tiếp nhận.",
        "en": "Huang Ling says she has worked overtime for three months without being paid for it. You are the HR person receiving the complaint."
      },
      "you": {
        "vi": "Nhân viên nhân sự tiếp nhận khiếu nại",
        "en": "HR staff member receiving the grievance"
      },
      "other": {
        "vi": "Huang Ling (黄玲), nhân viên đang khiếu nại",
        "en": "Huang Ling (黄玲), the employee raising the grievance"
      },
      "goal": {
        "vi": "Để cô ấy kể đầy đủ, hỏi chứng cứ, không phán xét trước, cam kết bảo mật và hẹn thời hạn trả lời bằng văn bản.",
        "en": "Let her tell the whole story, ask for evidence, prejudge nothing, promise confidentiality and set a written reply deadline."
      },
      "phrases": [
        {
          "zh": "谢谢您愿意来谈这件事。",
          "py": "Xièxie nín yuànyì lái tán zhè jiàn shì.",
          "vi": "Cảm ơn chị đã sẵn lòng đến trao đổi việc này.",
          "en": "Thank you for being willing to come and discuss this."
        },
        {
          "zh": "请您按时间顺序说一下事情的经过。",
          "py": "Qǐng nín àn shíjiān shùnxù shuō yíxià shìqíng de jīngguò.",
          "vi": "Xin chị kể lại sự việc theo thứ tự thời gian.",
          "en": "Please describe what happened in chronological order."
        },
        {
          "zh": "我理解您的感受。",
          "py": "Wǒ lǐjiě nín de gǎnshòu.",
          "vi": "Tôi hiểu cảm nhận của chị.",
          "en": "I understand how you feel."
        },
        {
          "zh": "您有相关的记录或证据吗？",
          "py": "Nín yǒu xiāngguān de jìlù huò zhèngjù ma?",
          "vi": "Chị có ghi chép hoặc chứng cứ liên quan không?",
          "en": "Do you have any relevant records or evidence?"
        },
        {
          "zh": "我们会了解各方的情况，保持公正。",
          "py": "Wǒmen huì liǎojiě gèfāng de qíngkuàng, bǎochí gōngzhèng.",
          "vi": "Chúng tôi sẽ tìm hiểu tình hình các bên và giữ sự công bằng.",
          "en": "We will hear all sides and stay impartial."
        },
        {
          "zh": "您反映的内容我们会严格保密。",
          "py": "Nín fǎnyìng de nèiróng wǒmen huì yángé bǎomì.",
          "vi": "Nội dung chị phản ánh chúng tôi sẽ giữ bí mật nghiêm ngặt.",
          "en": "What you report will be kept strictly confidential."
        },
        {
          "zh": "调查结果出来后，我会第一时间告诉您。",
          "py": "Diàochá jiéguǒ chūlái hòu, wǒ huì dìyī shíjiān gàosù nín.",
          "vi": "Khi có kết quả điều tra, tôi sẽ báo chị ngay lập tức.",
          "en": "Once the investigation has a result, I will tell you right away."
        },
        {
          "zh": "这段时间如果有任何情况，请随时联系我。",
          "py": "Zhè duàn shíjiān rúguǒ yǒu rènhé qíngkuàng, qǐng suíshí liánxì wǒ.",
          "vi": "Trong thời gian này nếu có bất kỳ tình huống nào, xin liên hệ tôi bất cứ lúc nào.",
          "en": "If anything happens in the meantime, please contact me at any time."
        }
      ]
    },
    {
      "kind": "script",
      "turns": [
        {
          "other": {
            "zh": "我想反映一个问题：我这三个月经常加班，但是加班费一直没有算。",
            "py": "Wǒ xiǎng fǎnyìng yí gè wèntí: wǒ zhè sān gè yuè jīngcháng jiābān, dànshì jiābānfèi yìzhí méiyǒu suàn.",
            "vi": "Tôi muốn phản ánh một vấn đề: ba tháng nay tôi thường xuyên làm thêm giờ nhưng tiền làm thêm chưa được tính.",
            "en": "I want to raise a problem: for three months I have often worked overtime, but the overtime pay has never been calculated."
          },
          "choices": [
            {
              "t": {
                "zh": "加班费肯定算了，您是不是记错了？",
                "py": "Jiābānfèi kěndìng suàn le, nín shì bú shì jì cuò le?",
                "vi": "Tiền làm thêm chắc chắn đã tính rồi, có phải chị nhớ nhầm không?",
                "en": "The overtime pay was definitely calculated; are you sure you remember correctly?"
              },
              "good": false,
              "feedback": {
                "vi": "Phủ nhận ngay, làm nhân viên thấy không được tin.",
                "en": "Dismisses her at once, so she feels disbelieved."
              }
            },
            {
              "t": {
                "zh": "这个问题很严重，我马上处理，您放心。",
                "py": "Zhège wèntí hěn yánzhòng, wǒ mǎshàng chǔlǐ, nín fàngxīn.",
                "vi": "Vấn đề này rất nghiêm trọng, tôi xử lý ngay, chị yên tâm.",
                "en": "This is a serious problem; I will deal with it right away, do not worry."
              },
              "good": false,
              "feedback": {
                "vi": "Kết luận và hứa trước khi biết sự thật.",
                "en": "Concludes and promises before knowing the facts."
              }
            },
            {
              "t": {
                "zh": "谢谢您来反映。请您按时间顺序说一下具体情况，好吗？",
                "py": "Xièxie nín lái fǎnyìng. Qǐng nín àn shíjiān shùnxù shuō yíxià jùtǐ qíngkuàng, hǎo ma?",
                "vi": "Cảm ơn chị đã phản ánh. Chị kể tình hình cụ thể theo thứ tự thời gian được không?",
                "en": "Thank you for raising this. Could you describe the details in chronological order?"
              },
              "good": true,
              "feedback": {
                "vi": "Cảm ơn, mời kể chi tiết, chưa kết luận gì.",
                "en": "Thanks her, invites detail, concludes nothing yet."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "部门经理说加班是自愿的，不用算加班费。",
            "py": "Bùmén jīnglǐ shuō jiābān shì zìyuàn de, bú yòng suàn jiābānfèi.",
            "vi": "Quản lý bộ phận nói làm thêm là tự nguyện, không cần tính tiền làm thêm.",
            "en": "My department manager says overtime is voluntary and does not need to be paid."
          },
          "choices": [
            {
              "t": {
                "zh": "经理这样说就是对的。",
                "py": "Jīnglǐ zhèyàng shuō jiù shì duì de.",
                "vi": "Quản lý nói vậy là đúng.",
                "en": "If the manager says so, then it is correct."
              },
              "good": false,
              "feedback": {
                "vi": "Đứng về một phía khi chưa điều tra.",
                "en": "Takes a side before any investigation."
              }
            },
            {
              "t": {
                "zh": "那就是自愿的，没有办法了。",
                "py": "Nà jiù shì zìyuàn de, méiyǒu bànfǎ le.",
                "vi": "Vậy là tự nguyện rồi, hết cách.",
                "en": "Then it was voluntary and nothing can be done."
              },
              "good": false,
              "feedback": {
                "vi": "Kết luận vội và đóng cửa đối thoại.",
                "en": "Hasty conclusion that closes the discussion."
              }
            },
            {
              "t": {
                "zh": "我明白了。您有加班的记录吗？比如考勤、邮件或者聊天记录。",
                "py": "Wǒ míngbái le. Nín yǒu jiābān de jìlù ma? Bǐrú kǎoqín, yóujiàn huòzhě liáotiān jìlù.",
                "vi": "Tôi hiểu rồi. Chị có ghi chép làm thêm không? Ví dụ chấm công, email hoặc tin nhắn.",
                "en": "I see. Do you have records of the overtime, such as attendance, emails or chat messages?"
              },
              "good": true,
              "feedback": {
                "vi": "Hỏi chứng cứ cụ thể, không đứng về phía nào.",
                "en": "Asks for concrete evidence and takes no side."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "我很生气，感觉公司根本不重视我们。",
            "py": "Wǒ hěn shēngqì, gǎnjué gōngsī gēnběn bú zhòngshì wǒmen.",
            "vi": "Tôi rất bực, cảm thấy công ty hoàn toàn không coi trọng chúng tôi.",
            "en": "I am very angry; I feel the company does not value us at all."
          },
          "choices": [
            {
              "t": {
                "zh": "我理解您的感受。我们会认真了解情况，也会听取经理的说法，保持公正。",
                "py": "Wǒ lǐjiě nín de gǎnshòu. Wǒmen huì rènzhēn liǎojiě qíngkuàng, yě huì tīngqǔ jīnglǐ de shuōfǎ, bǎochí gōngzhèng.",
                "vi": "Tôi hiểu cảm nhận của chị. Chúng tôi sẽ tìm hiểu nghiêm túc và cũng nghe ý kiến quản lý, giữ công bằng.",
                "en": "I understand how you feel. We will look into it carefully and also hear the manager's side, staying impartial."
              },
              "good": true,
              "feedback": {
                "vi": "Đồng cảm nhưng vẫn trung lập.",
                "en": "Empathetic yet neutral."
              }
            },
            {
              "t": {
                "zh": "您别生气，这没什么大不了的。",
                "py": "Nín bié shēngqì, zhè méi shénme dàbùliǎo de.",
                "vi": "Chị đừng giận, chuyện này không có gì to tát.",
                "en": "Do not be angry; it is no big deal."
              },
              "good": false,
              "feedback": {
                "vi": "Xem nhẹ cảm xúc và vấn đề của nhân viên.",
                "en": "Plays down her feelings and the problem."
              }
            },
            {
              "t": {
                "zh": "对，公司确实不重视员工，我也觉得经理不对。",
                "py": "Duì, gōngsī quèshí bú zhòngshì yuángōng, wǒ yě juéde jīnglǐ bú duì.",
                "vi": "Đúng, công ty quả thật không coi trọng nhân viên, tôi cũng thấy quản lý sai.",
                "en": "Yes, the company really does not value staff, and I think the manager is wrong too."
              },
              "good": false,
              "feedback": {
                "vi": "Mất tính trung lập và nói xấu công ty, rất rủi ro.",
                "en": "Gives up neutrality and criticises the company; risky."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "我说的这些，会不会传到经理那里？我怕他以后对我有意见。",
            "py": "Wǒ shuō de zhèxiē, huì bú huì chuándào jīnglǐ nàlǐ? Wǒ pà tā yǐhòu duì wǒ yǒu yìjiàn.",
            "vi": "Những điều tôi nói có đến tai quản lý không? Tôi sợ sau này anh ấy có ác cảm với tôi.",
            "en": "Will what I say reach the manager? I am afraid he will hold it against me."
          },
          "choices": [
            {
              "t": {
                "zh": "肯定会让经理知道，这样才公平。",
                "py": "Kěndìng huì ràng jīnglǐ zhīdào, zhèyàng cái gōngpíng.",
                "vi": "Chắc chắn sẽ cho quản lý biết, như vậy mới công bằng.",
                "en": "The manager will certainly be told; that is what is fair."
              },
              "good": false,
              "feedback": {
                "vi": "Bỏ qua nỗi lo bị trả đũa, làm nhân viên không dám nói tiếp.",
                "en": "Ignores her fear of retaliation, so she may stop talking."
              }
            },
            {
              "t": {
                "zh": "不会的，我保证没有任何人知道。",
                "py": "Bú huì de, wǒ bǎozhèng méiyǒu rènhé rén zhīdào.",
                "vi": "Không đâu, tôi đảm bảo không ai biết.",
                "en": "No, I guarantee nobody will know."
              },
              "good": false,
              "feedback": {
                "vi": "Hứa tuyệt đối trong khi điều tra có thể cần nói chuyện với người liên quan.",
                "en": "An absolute promise that the investigation may force you to break."
              }
            },
            {
              "t": {
                "zh": "您反映的内容我们会严格保密，只在调查需要时告知相关人员，也不允许任何报复行为。",
                "py": "Nín fǎnyìng de nèiróng wǒmen huì yángé bǎomì, zhǐ zài diàochá xūyào shí gàozhī xiāngguān rényuán, yě bù yǔnxǔ rènhé bàofù xíngwéi.",
                "vi": "Nội dung chị phản ánh chúng tôi giữ bí mật nghiêm ngặt, chỉ thông báo cho người liên quan khi điều tra cần, và không cho phép hành vi trả đũa.",
                "en": "We will keep it strictly confidential, tell only the people involved when the investigation requires it, and allow no retaliation."
              },
              "good": true,
              "feedback": {
                "vi": "Trung thực về giới hạn bảo mật và cam kết chống trả đũa.",
                "en": "Honest about the limits of confidentiality and firm against retaliation."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "那接下来会怎么处理？",
            "py": "Nà jiēxiàlái huì zěnme chǔlǐ?",
            "vi": "Vậy tiếp theo sẽ xử lý thế nào?",
            "en": "So what will happen next?"
          },
          "choices": [
            {
              "t": {
                "zh": "您回去等通知吧。",
                "py": "Nín huíqù děng tōngzhī ba.",
                "vi": "Chị về chờ thông báo đi.",
                "en": "Go back and wait for a notice."
              },
              "good": false,
              "feedback": {
                "vi": "Không có bước và thời hạn, thiếu tôn trọng.",
                "en": "No steps or deadline, and dismissive."
              }
            },
            {
              "t": {
                "zh": "我们会先核实考勤记录，再分别谈话，两周内给您书面答复。",
                "py": "Wǒmen huì xiān héshí kǎoqín jìlù, zài fēnbié tánhuà, liǎng zhōu nèi gěi nín shūmiàn dáfù.",
                "vi": "Chúng tôi sẽ đối chiếu chấm công trước, rồi nói chuyện riêng với từng bên, trong hai tuần sẽ trả lời chị bằng văn bản.",
                "en": "We will first check the attendance records, then talk to each side separately, and give you a written reply within two weeks."
              },
              "good": true,
              "feedback": {
                "vi": "Nêu rõ các bước và thời hạn, đúng quy trình.",
                "en": "Clear steps and a deadline, good process."
              }
            },
            {
              "t": {
                "zh": "下周就给您补发全部加班费。",
                "py": "Xià zhōu jiù gěi nín bǔfā quánbù jiābānfèi.",
                "vi": "Tuần sau sẽ truy trả toàn bộ tiền làm thêm cho chị.",
                "en": "Next week we will pay you all the overtime pay."
              },
              "good": false,
              "feedback": {
                "vi": "Phán quyết trước khi xác minh.",
                "en": "Pre-judges the outcome before verification."
              }
            }
          ]
        }
      ]
    },
    {
      "kind": "free",
      "opener": {
        "zh": "您好，我想反映加班费的问题。",
        "py": "Nín hǎo, wǒ xiǎng fǎnyìng jiābānfèi de wèntí.",
        "vi": "Chào anh/chị, tôi muốn phản ánh vấn đề tiền làm thêm giờ.",
        "en": "Hello, I want to raise the issue of overtime pay."
      },
      "aiBrief": "Play Huang Ling, an upset employee who reports unpaid overtime over three months. Use simple business Chinese, worry about retaliation from your manager, and calm down only if HR listens, asks for evidence and explains the next steps.",
      "goal": {
        "vi": "Lắng nghe, hỏi chứng cứ, cam kết bảo mật và nêu thời hạn trả lời.",
        "en": "Listen, ask for evidence, promise confidentiality and state a reply deadline."
      },
      "tips": [
        {
          "vi": "Đừng tranh luận đúng sai ngay; hãy nói 我理解 trước.",
          "en": "Do not argue who is right at once; say 我理解 first."
        },
        {
          "vi": "Dùng 记录 và 证据 để đưa cuộc nói chuyện về sự việc cụ thể.",
          "en": "Use 记录 and 证据 to bring the talk back to concrete facts."
        },
        {
          "vi": "Kết thúc bằng bước tiếp theo và thời hạn, ví dụ 两周内.",
          "en": "Close with the next step and a deadline such as 两周内."
        }
      ]
    }
  ]
},
{
  "week": 9,
  "block": "roleplay",
  "title": {
    "zh": "离职面谈",
    "vi": "Phỏng vấn nghỉ việc",
    "en": "Exit interview"
  },
  "goal": {
    "vi": "Thực hiện buổi phỏng vấn nghỉ việc: cảm ơn, hỏi lý do thật, ghi nhận góp ý và giải thích thủ tục cuối cùng.",
    "en": "Run an exit interview: thank the employee, ask the real reasons, record feedback and explain the final formalities."
  },
  "sessions": [
    {
      "kind": "prep",
      "scenario": {
        "vi": "Lin Hao đã nộp đơn xin nghỉ sau hai năm làm việc. Bạn gặp anh ấy để tìm hiểu lý do thật sự và hướng dẫn thủ tục nghỉ việc.",
        "en": "Lin Hao has resigned after two years. You meet him to learn his real reasons and explain the leaving procedure."
      },
      "you": {
        "vi": "Nhân viên nhân sự phụ trách phỏng vấn nghỉ việc",
        "en": "HR staff member conducting the exit interview"
      },
      "other": {
        "vi": "Lin Hao (林浩), nhân viên sắp nghỉ",
        "en": "Lin Hao (林浩), the departing employee"
      },
      "goal": {
        "vi": "Tạo không khí cởi mở, hỏi lý do, không tranh cãi hay thuyết phục, ghi nhận góp ý và nói rõ thủ tục cùng khoản thanh toán cuối cùng.",
        "en": "Keep it open, ask the reasons, do not argue or persuade, note his feedback and explain the formalities and final payment."
      },
      "phrases": [
        {
          "zh": "感谢您这两年的付出。",
          "py": "Gǎnxiè nín zhè liǎng nián de fùchū.",
          "vi": "Cảm ơn sự cống hiến của anh trong hai năm qua.",
          "en": "Thank you for your contribution over these two years."
        },
        {
          "zh": "这次谈话是为了了解您离职的真实原因。",
          "py": "Zhè cì tánhuà shì wèile liǎojiě nín lízhí de zhēnshí yuányīn.",
          "vi": "Buổi trao đổi này nhằm tìm hiểu lý do nghỉ việc thật sự của anh.",
          "en": "This talk is to understand your real reasons for leaving."
        },
        {
          "zh": "您的意见对我们改进工作很有帮助。",
          "py": "Nín de yìjiàn duì wǒmen gǎijìn gōngzuò hěn yǒu bāngzhù.",
          "vi": "Ý kiến của anh rất hữu ích cho việc cải thiện công việc của chúng tôi.",
          "en": "Your opinions are very helpful for improving our work."
        },
        {
          "zh": "您主要是因为什么决定离开的？",
          "py": "Nín zhǔyào shì yīnwèi shénme juédìng líkāi de?",
          "vi": "Chủ yếu vì lý do gì mà anh quyết định rời đi?",
          "en": "What was the main reason you decided to leave?"
        },
        {
          "zh": "您觉得公司在哪些方面可以做得更好？",
          "py": "Nín juéde gōngsī zài nǎxiē fāngmiàn kěyǐ zuò de gèng hǎo?",
          "vi": "Anh thấy công ty có thể làm tốt hơn ở những mặt nào?",
          "en": "In which areas do you think the company could do better?"
        },
        {
          "zh": "离职手续包括工作交接和办理离职证明。",
          "py": "Lízhí shǒuxù bāokuò gōngzuò jiāojiē hé bànlǐ lízhí zhèngmíng.",
          "vi": "Thủ tục nghỉ việc gồm bàn giao công việc và làm giấy xác nhận nghỉ việc.",
          "en": "The leaving formalities include handing over work and issuing the leaving certificate."
        },
        {
          "zh": "最后一个月的工资和未休年假会按规定结算。",
          "py": "Zuìhòu yí gè yuè de gōngzī hé wèi xiū niánjià huì àn guīdìng jiésuàn.",
          "vi": "Lương tháng cuối và phép năm chưa nghỉ sẽ được tất toán theo quy định.",
          "en": "Your final month's pay and unused annual leave will be settled according to the rules."
        },
        {
          "zh": "欢迎您以后保持联系。",
          "py": "Huānyíng nín yǐhòu bǎochí liánxì.",
          "vi": "Hoan nghênh anh giữ liên lạc sau này.",
          "en": "You are welcome to stay in touch."
        }
      ]
    },
    {
      "kind": "script",
      "turns": [
        {
          "other": {
            "zh": "您好，听说今天要做离职面谈。",
            "py": "Nín hǎo, tīngshuō jīntiān yào zuò lízhí miàntán.",
            "vi": "Chào anh/chị, nghe nói hôm nay có buổi phỏng vấn nghỉ việc.",
            "en": "Hello, I heard there is an exit interview today."
          },
          "choices": [
            {
              "t": {
                "zh": "是的，您都要走了，随便聊聊就行。",
                "py": "Shì de, nín dōu yào zǒu le, suíbiàn liáoliao jiù xíng.",
                "vi": "Vâng, anh sắp đi rồi, nói chuyện qua loa thôi.",
                "en": "Yes, you are leaving anyway, so just chat casually."
              },
              "good": false,
              "feedback": {
                "vi": "Làm buổi phỏng vấn mất giá trị và thiếu tôn trọng.",
                "en": "Undermines the interview and sounds disrespectful."
              }
            },
            {
              "t": {
                "zh": "是的，谢谢您抽时间来。这次谈话是想了解您离职的真实原因，您可以放心说。",
                "py": "Shì de, xièxie nín chōu shíjiān lái. Zhè cì tánhuà shì xiǎng liǎojiě nín lízhí de zhēnshí yuányīn, nín kěyǐ fàngxīn shuō.",
                "vi": "Vâng, cảm ơn anh đã dành thời gian. Buổi này để tìm hiểu lý do thật sự, anh cứ yên tâm nói.",
                "en": "Yes, thank you for coming. This talk is to understand your real reasons, so please feel free to speak."
              },
              "good": true,
              "feedback": {
                "vi": "Cảm ơn, nêu mục đích và tạo sự yên tâm.",
                "en": "Thanks him, states the purpose and puts him at ease."
              }
            },
            {
              "t": {
                "zh": "对，请回答我的问题，不要说无关的话。",
                "py": "Duì, qǐng huídá wǒ de wèntí, bú yào shuō wúguān de huà.",
                "vi": "Đúng, hãy trả lời câu hỏi của tôi, đừng nói chuyện không liên quan.",
                "en": "Yes, answer my questions and do not say irrelevant things."
              },
              "good": false,
              "feedback": {
                "vi": "Giọng thẩm vấn, nhân viên sẽ không nói thật.",
                "en": "Sounds like an interrogation; he will not be candid."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "主要原因是薪资，另一家公司给的比现在高不少。",
            "py": "Zhǔyào yuányīn shì xīnzī, lìng yì jiā gōngsī gěi de bǐ xiànzài gāo bù shǎo.",
            "vi": "Lý do chính là lương, công ty khác trả cao hơn hiện tại khá nhiều.",
            "en": "The main reason is pay; another company offers a good deal more than I earn now."
          },
          "choices": [
            {
              "t": {
                "zh": "那我们也没办法，薪资是总部决定的。",
                "py": "Nà wǒmen yě méi bànfǎ, xīnzī shì zǒngbù juédìng de.",
                "vi": "Vậy chúng tôi cũng bó tay, lương do tổng bộ quyết định.",
                "en": "Then we cannot help; pay is decided by HQ."
              },
              "good": false,
              "feedback": {
                "vi": "Đổ lỗi, kết thúc đề tài sớm và bỏ lỡ thông tin.",
                "en": "Shifts blame and ends the topic too early."
              }
            },
            {
              "t": {
                "zh": "您这样说不太合适，别的公司也不一定好。",
                "py": "Nín zhèyàng shuō bú tài héshì, bié de gōngsī yě bù yídìng hǎo.",
                "vi": "Anh nói vậy không phù hợp lắm, công ty khác chưa chắc đã tốt.",
                "en": "That is not quite appropriate to say; other companies are not necessarily better."
              },
              "good": false,
              "feedback": {
                "vi": "Tranh cãi và cố thuyết phục người sắp đi.",
                "en": "Argues and tries to persuade someone who is leaving."
              }
            },
            {
              "t": {
                "zh": "谢谢您坦率地告诉我们。除了薪资，您对工作内容和发展机会满意吗？",
                "py": "Xièxie nín tǎnshuài de gàosù wǒmen. Chúle xīnzī, nín duì gōngzuò nèiróng hé fāzhǎn jīhuì mǎnyì ma?",
                "vi": "Cảm ơn anh đã nói thẳng. Ngoài lương, anh có hài lòng về nội dung công việc và cơ hội phát triển không?",
                "en": "Thank you for being frank. Besides pay, are you satisfied with the work and the development opportunities?"
              },
              "good": true,
              "feedback": {
                "vi": "Cảm ơn và đào sâu thêm các yếu tố khác.",
                "en": "Thanks him and probes other factors."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "说实话，晋升的机会太少了，我在这个岗位已经三年了。",
            "py": "Shuō shíhuà, jìnshēng de jīhuì tài shǎo le, wǒ zài zhège gǎngwèi yǐjīng sān nián le.",
            "vi": "Nói thật, cơ hội thăng tiến quá ít, tôi ở vị trí này đã ba năm.",
            "en": "Honestly, there are too few promotion opportunities; I have been in this role for three years."
          },
          "choices": [
            {
              "t": {
                "zh": "晋升要看能力，不是时间长就行。",
                "py": "Jìnshēng yào kàn nénglì, bú shì shíjiān zhǎng jiù xíng.",
                "vi": "Thăng tiến dựa vào năng lực, không phải cứ lâu là được.",
                "en": "Promotion depends on ability, not just on length of service."
              },
              "good": false,
              "feedback": {
                "vi": "Phản bác, làm nhân viên ngừng chia sẻ.",
                "en": "Rebuts him, so he stops sharing."
              }
            },
            {
              "t": {
                "zh": "您说得对，公司的晋升制度确实有问题。",
                "py": "Nín shuō de duì, gōngsī de jìnshēng zhìdù quèshí yǒu wèntí.",
                "vi": "Anh nói đúng, chế độ thăng tiến của công ty đúng là có vấn đề.",
                "en": "You are right, the company's promotion system really is flawed."
              },
              "good": false,
              "feedback": {
                "vi": "Nhân sự không nên thừa nhận hay chỉ trích trong buổi này.",
                "en": "HR should not agree or criticise the company in this meeting."
              }
            },
            {
              "t": {
                "zh": "我记下来了。您觉得公司在职业发展方面可以做哪些改进？",
                "py": "Wǒ jì xiàlái le. Nín juéde gōngsī zài zhíyè fāzhǎn fāngmiàn kěyǐ zuò nǎxiē gǎijìn?",
                "vi": "Tôi đã ghi lại. Anh thấy công ty có thể cải thiện gì về phát triển nghề nghiệp?",
                "en": "I have noted that. What improvements could the company make in career development?"
              },
              "good": true,
              "feedback": {
                "vi": "Ghi nhận và xin gợi ý cụ thể.",
                "en": "Records it and asks for concrete suggestions."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "另外，我最后一个月的工资和年假怎么算？",
            "py": "Lìngwài, wǒ zuìhòu yí gè yuè de gōngzī hé niánjià zěnme suàn?",
            "vi": "Ngoài ra, lương tháng cuối và phép năm của tôi tính thế nào?",
            "en": "Also, how will my final month's pay and annual leave be calculated?"
          },
          "choices": [
            {
              "t": {
                "zh": "年假没休就算了，离职后不再补。",
                "py": "Niánjià méi xiū jiù suàn le, lízhí hòu bú zài bǔ.",
                "vi": "Phép năm chưa nghỉ thì thôi, nghỉ việc rồi không bù nữa.",
                "en": "Unused leave is simply lost and will not be paid after you leave."
              },
              "good": false,
              "feedback": {
                "vi": "Khẳng định tuyệt đối khi chưa kiểm tra, có thể sai quy định.",
                "en": "An absolute claim without checking; may breach the rules."
              }
            },
            {
              "t": {
                "zh": "应该没问题，具体多少我不知道。",
                "py": "Yīnggāi méi wèntí, jùtǐ duōshǎo wǒ bù zhīdào.",
                "vi": "Chắc không vấn đề, cụ thể bao nhiêu tôi không biết.",
                "en": "Should be fine, but I do not know the exact amount."
              },
              "good": false,
              "feedback": {
                "vi": "Mơ hồ, nhân viên vẫn không biết gì.",
                "en": "Vague; he learns nothing."
              }
            },
            {
              "t": {
                "zh": "工资会在最后工作日之后按规定结算，未休年假也会按公司制度和法律规定处理，我会把明细发给您。",
                "py": "Gōngzī huì zài zuìhòu gōngzuòrì zhīhòu àn guīdìng jiésuàn, wèi xiū niánjià yě huì àn gōngsī zhìdù hé fǎlǜ guīdìng chǔlǐ, wǒ huì bǎ míngxì fā gěi nín.",
                "vi": "Lương sẽ tất toán theo quy định sau ngày làm việc cuối cùng, phép năm chưa nghỉ cũng xử lý theo quy chế và pháp luật, tôi sẽ gửi bảng chi tiết cho anh.",
                "en": "Your pay will be settled according to the rules after your last working day, unused leave will be handled under company policy and the law, and I will send you the details."
              },
              "good": true,
              "feedback": {
                "vi": "Cẩn trọng, dựa trên quy định và hứa gửi chi tiết.",
                "en": "Cautious, rule-based, and promises a breakdown."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "好的，谢谢。",
            "py": "Hǎo de, xièxie.",
            "vi": "Vâng, cảm ơn.",
            "en": "OK, thank you."
          },
          "choices": [
            {
              "t": {
                "zh": "好，再见。",
                "py": "Hǎo, zàijiàn.",
                "vi": "Vâng, tạm biệt.",
                "en": "OK, goodbye."
              },
              "good": false,
              "feedback": {
                "vi": "Quá cụt, bỏ lỡ lời cảm ơn và hướng dẫn thủ tục.",
                "en": "Too abrupt; no thanks and no next steps."
              }
            },
            {
              "t": {
                "zh": "也谢谢您这两年的付出。请先完成工作交接，离职证明我们会按时办好，欢迎您以后保持联系。",
                "py": "Yě xièxie nín zhè liǎng nián de fùchū. Qǐng xiān wánchéng gōngzuò jiāojiē, lízhí zhèngmíng wǒmen huì ànshí bànhǎo, huānyíng nín yǐhòu bǎochí liánxì.",
                "vi": "Cũng cảm ơn anh vì hai năm cống hiến. Xin hoàn tất bàn giao trước, giấy xác nhận nghỉ việc chúng tôi sẽ làm đúng hạn, hoan nghênh anh giữ liên lạc.",
                "en": "Thank you too for these two years. Please finish the handover first; we will prepare your leaving certificate on time, and you are welcome to stay in touch."
              },
              "good": true,
              "feedback": {
                "vi": "Kết thúc ấm áp, nhắc bước tiếp theo.",
                "en": "A warm close that restates the next steps."
              }
            },
            {
              "t": {
                "zh": "您走了以后，不要说公司的坏话。",
                "py": "Nín zǒu le yǐhòu, bú yào shuō gōngsī de huàihuà.",
                "vi": "Sau khi anh đi, đừng nói xấu công ty.",
                "en": "After you leave, do not say bad things about the company."
              },
              "good": false,
              "feedback": {
                "vi": "Mang tính cảnh cáo, làm hỏng thiện cảm cuối cùng.",
                "en": "Sounds like a warning and spoils the goodwill."
              }
            }
          ]
        }
      ]
    },
    {
      "kind": "free",
      "opener": {
        "zh": "您好，我是来做离职面谈的。",
        "py": "Nín hǎo, wǒ shì lái zuò lízhí miàntán de.",
        "vi": "Chào anh/chị, tôi đến để làm phỏng vấn nghỉ việc.",
        "en": "Hello, I am here for my exit interview."
      },
      "aiBrief": "Play Lin Hao, a departing engineer. Use simple business Chinese. You are leaving mainly for better pay and promotion chances, you answer honestly if treated politely, and you ask how your final salary and unused leave will be handled.",
      "goal": {
        "vi": "Cảm ơn, hỏi lý do thật, ghi nhận góp ý mà không tranh cãi, rồi giải thích thủ tục và khoản thanh toán cuối.",
        "en": "Thank him, ask the real reasons, take his feedback without arguing, then explain the formalities and final payment."
      },
      "tips": [
        {
          "vi": "Hỏi câu mở như 您觉得……可以做得更好? để nhân viên nói nhiều hơn.",
          "en": "Use open questions such as 您觉得……可以做得更好? to make him talk."
        },
        {
          "vi": "Đừng cố giữ người ở lại, chỉ ghi nhận bằng 我记下来了.",
          "en": "Do not try to keep him; just acknowledge with 我记下来了."
        },
        {
          "vi": "Nói rõ ba việc: bàn giao, giấy xác nhận nghỉ việc, thanh toán cuối.",
          "en": "State three things: handover, leaving certificate, final payment."
        }
      ]
    }
  ]
},
{
  "week": 10,
  "block": "roleplay",
  "title": {
    "zh": "与审计师对答",
    "vi": "Trả lời kiểm toán viên Trung Quốc",
    "en": "Audit Q&A with a Chinese auditor"
  },
  "goal": {
    "vi": "Trả lời câu hỏi kiểm toán về lương thưởng: chuẩn bị tài liệu, giải thích số liệu, không đoán mò và hẹn bổ sung hồ sơ.",
    "en": "Answer audit questions on pay: have documents ready, explain figures, never guess, and promise supplementary files."
  },
  "sessions": [
    {
      "kind": "prep",
      "scenario": {
        "vi": "Kiểm toán viên Chu từ tổng bộ đến kiểm tra hồ sơ lương thưởng quý IV của công ty con. Bạn là người phụ trách C&B tiếp đón và trả lời.",
        "en": "Auditor Zhou from HQ is checking the Q4 pay records of the subsidiary. You, the C&B owner, host the audit and answer questions."
      },
      "you": {
        "vi": "Phụ trách C&B của công ty con",
        "en": "C&B owner at the subsidiary"
      },
      "other": {
        "vi": "Chu kiểm toán viên (周审计) từ tổng bộ",
        "en": "Auditor Zhou (周审计) from HQ"
      },
      "goal": {
        "vi": "Cung cấp đúng hồ sơ, giải thích có căn cứ, thừa nhận điều chưa chắc và hẹn thời hạn bổ sung, không che giấu.",
        "en": "Provide the right files, explain with evidence, admit what you are unsure of, set a deadline, and hide nothing."
      },
      "phrases": [
        {
          "zh": "我们已经准备好了您要的工资表和考勤记录。",
          "py": "Wǒmen yǐjīng zhǔnbèi hǎo le nín yào de gōngzībiǎo hé kǎoqín jìlù.",
          "vi": "Chúng tôi đã chuẩn bị xong bảng lương và dữ liệu chấm công mà ông cần.",
          "en": "We have prepared the payroll and attendance records you asked for."
        },
        {
          "zh": "这笔奖金是按照奖金管理办法发放的。",
          "py": "Zhè bǐ jiǎngjīn shì ànzhào jiǎngjīn guǎnlǐ bànfǎ fāfàng de.",
          "vi": "Khoản thưởng này được chi theo quy chế quản lý tiền thưởng.",
          "en": "This bonus was paid under the bonus management measures."
        },
        {
          "zh": "相关审批记录在系统里，我马上给您调出来。",
          "py": "Xiāngguān shěnpī jìlù zài xìtǒng lǐ, wǒ mǎshàng gěi nín diàochūlái.",
          "vi": "Hồ sơ phê duyệt liên quan có trong hệ thống, tôi lấy ra ngay cho ông.",
          "en": "The approval records are in the system; I will pull them up right away."
        },
        {
          "zh": "请问您想核对哪个月份的数据？",
          "py": "Qǐngwèn nín xiǎng héduì nǎge yuèfèn de shùjù?",
          "vi": "Xin hỏi ông muốn đối chiếu dữ liệu tháng nào?",
          "en": "Which month's data would you like to check?"
        },
        {
          "zh": "这个数字包含基本工资、补贴和加班费。",
          "py": "Zhège shùzì bāohán jīběn gōngzī, bǔtiē hé jiābānfèi.",
          "vi": "Con số này gồm lương cơ bản, phụ cấp và tiền làm thêm giờ.",
          "en": "This figure includes base salary, allowances and overtime pay."
        },
        {
          "zh": "这一点我需要跟财务确认后再回复您。",
          "py": "Zhè yì diǎn wǒ xūyào gēn cáiwù quèrèn hòu zài huífù nín.",
          "vi": "Điểm này tôi cần xác nhận với kế toán rồi mới trả lời ông.",
          "en": "I need to confirm this with Finance before replying to you."
        },
        {
          "zh": "差异的原因是上个月有人员入职和离职。",
          "py": "Chāyì de yuányīn shì shàng gè yuè yǒu rényuán rùzhí hé lízhí.",
          "vi": "Nguyên nhân chênh lệch là tháng trước có nhân sự vào và nghỉ việc.",
          "en": "The difference is due to new hires and leavers last month."
        },
        {
          "zh": "我们会在三个工作日内补充提交材料。",
          "py": "Wǒmen huì zài sān gè gōngzuòrì nèi bǔchōng tíjiāo cáiliào.",
          "vi": "Chúng tôi sẽ bổ sung hồ sơ trong vòng ba ngày làm việc.",
          "en": "We will submit the supplementary materials within three working days."
        }
      ]
    },
    {
      "kind": "script",
      "turns": [
        {
          "other": {
            "zh": "我们想核对一下去年第四季度的工资发放记录。请把工资表和银行转账记录给我。",
            "py": "Wǒmen xiǎng héduì yíxià qùnián dìsì jìdù de gōngzī fāfàng jìlù. Qǐng bǎ gōngzībiǎo hé yínháng zhuǎnzhàng jìlù gěi wǒ.",
            "vi": "Chúng tôi muốn đối chiếu hồ sơ chi lương quý IV năm ngoái. Xin đưa tôi bảng lương và sao kê chuyển khoản.",
            "en": "We would like to check the pay records for last year's fourth quarter. Please give me the payroll and the bank transfer records."
          },
          "choices": [
            {
              "t": {
                "zh": "这些资料很多，您自己去系统里找吧。",
                "py": "Zhèxiē zīliào hěn duō, nín zìjǐ qù xìtǒng lǐ zhǎo ba.",
                "vi": "Tài liệu này nhiều lắm, ông tự vào hệ thống tìm đi.",
                "en": "There is a lot of material; go and find it in the system yourself."
              },
              "good": false,
              "feedback": {
                "vi": "Thiếu hợp tác, gây ấn tượng xấu với kiểm toán.",
                "en": "Uncooperative, leaves a bad impression on an auditor."
              }
            },
            {
              "t": {
                "zh": "好的，工资表和银行转账记录我们已经准备好了，请问您想先看哪个月份？",
                "py": "Hǎo de, gōngzībiǎo hé yínháng zhuǎnzhàng jìlù wǒmen yǐjīng zhǔnbèi hǎo le, qǐngwèn nín xiǎng xiān kàn nǎge yuèfèn?",
                "vi": "Vâng, bảng lương và sao kê chuyển khoản chúng tôi đã chuẩn bị xong, xin hỏi ông muốn xem tháng nào trước?",
                "en": "Certainly, we have the payroll and transfer records ready; which month would you like first?"
              },
              "good": true,
              "feedback": {
                "vi": "Chủ động, đã chuẩn bị sẵn và hỏi để đi đúng trọng tâm.",
                "en": "Proactive, prepared, and asks to focus the check."
              }
            },
            {
              "t": {
                "zh": "转账记录在财务那边，我不清楚，您去问他们。",
                "py": "Zhuǎnzhàng jìlù zài cáiwù nàbiān, wǒ bù qīngchǔ, nín qù wèn tāmen.",
                "vi": "Sao kê ở phòng kế toán, tôi không rõ, ông đi hỏi họ.",
                "en": "The transfer records are with Finance; I do not know, ask them."
              },
              "good": false,
              "feedback": {
                "vi": "Đẩy trách nhiệm, không phối hợp với bộ phận khác.",
                "en": "Passes the buck instead of coordinating with Finance."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "十二月的奖金总额比十一月多了很多，请解释一下。",
            "py": "Shíèr yuè de jiǎngjīn zǒngé bǐ shíyī yuè duō le hěn duō, qǐng jiěshì yíxià.",
            "vi": "Tổng tiền thưởng tháng mười hai nhiều hơn tháng mười một rất nhiều, xin giải thích.",
            "en": "December's total bonus is much higher than November's. Please explain."
          },
          "choices": [
            {
              "t": {
                "zh": "奖金是领导定的，我只负责发放。",
                "py": "Jiǎngjīn shì lǐngdǎo dìng de, wǒ zhǐ fùzé fāfàng.",
                "vi": "Thưởng do lãnh đạo quyết định, tôi chỉ lo việc chi trả.",
                "en": "Bonuses are set by the leaders; I only handle payment."
              },
              "good": false,
              "feedback": {
                "vi": "Né tránh, kiểm toán sẽ nghi ngờ quy trình.",
                "en": "Evasive; the auditor will doubt the process."
              }
            },
            {
              "t": {
                "zh": "十二月包含年终奖，是按照奖金管理办法和绩效结果发放的，审批记录我马上给您调出来。",
                "py": "Shíèr yuè bāohán niánzhōngjiǎng, shì ànzhào jiǎngjīn guǎnlǐ bànfǎ hé jìxiào jiéguǒ fāfàng de, shěnpī jìlù wǒ mǎshàng gěi nín diàochūlái.",
                "vi": "Tháng mười hai có thưởng cuối năm, chi theo quy chế thưởng và kết quả hiệu suất, hồ sơ phê duyệt tôi lấy ra ngay.",
                "en": "December includes the year-end bonus, paid under the bonus measures and performance results; I will pull up the approval records now."
              },
              "good": true,
              "feedback": {
                "vi": "Giải thích có căn cứ và sẵn sàng đưa chứng từ.",
                "en": "Gives a grounded explanation and offers the evidence."
              }
            },
            {
              "t": {
                "zh": "可能是多发了吧，我也不太清楚。",
                "py": "Kěnéng shì duō fā le ba, wǒ yě bú tài qīngchǔ.",
                "vi": "Có lẽ là chi dư rồi, tôi cũng không rõ lắm.",
                "en": "Maybe it was overpaid; I am not really sure either."
              },
              "good": false,
              "feedback": {
                "vi": "Đoán mò và vô tình thừa nhận sai sót.",
                "en": "Guessing, and carelessly admits an error."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "我发现有三位员工的加班时间超过了公司规定的上限，这是怎么回事？",
            "py": "Wǒ fāxiàn yǒu sān wèi yuángōng de jiābān shíjiān chāoguò le gōngsī guīdìng de shàngxiàn, zhè shì zěnme huíshì?",
            "vi": "Tôi thấy có ba nhân viên làm thêm vượt mức tối đa công ty quy định, đây là chuyện gì?",
            "en": "I found three employees whose overtime exceeded the company limit. What happened?"
          },
          "choices": [
            {
              "t": {
                "zh": "这一点我需要先核对考勤和审批记录，确认原因后再书面回复您，可以吗？",
                "py": "Zhè yì diǎn wǒ xūyào xiān héduì kǎoqín hé shěnpī jìlù, quèrèn yuányīn hòu zài shūmiàn huífù nín, kěyǐ ma?",
                "vi": "Điểm này tôi cần đối chiếu chấm công và phê duyệt trước, xác nhận nguyên nhân rồi trả lời bằng văn bản, được không?",
                "en": "I need to check the attendance and approval records first, then reply in writing once I confirm the cause. Is that all right?"
              },
              "good": true,
              "feedback": {
                "vi": "Trung thực, không đoán, hẹn trả lời bằng văn bản.",
                "en": "Honest, no guessing, and promises a written reply."
              }
            },
            {
              "t": {
                "zh": "没有这回事，您看错了。",
                "py": "Méiyǒu zhè huíshì, nín kàn cuò le.",
                "vi": "Không có chuyện này, ông xem nhầm rồi.",
                "en": "That is not so; you misread it."
              },
              "good": false,
              "feedback": {
                "vi": "Phủ nhận khi chưa kiểm tra, có thể bị bắt lỗi.",
                "en": "Denies before checking and may be proved wrong."
              }
            },
            {
              "t": {
                "zh": "这是部门经理的问题，跟人事部没关系。",
                "py": "Zhè shì bùmén jīnglǐ de wèntí, gēn rénshìbù méi guānxì.",
                "vi": "Đây là vấn đề của quản lý bộ phận, không liên quan đến phòng nhân sự.",
                "en": "That is the department manager's problem; HR has nothing to do with it."
              },
              "good": false,
              "feedback": {
                "vi": "Đổ trách nhiệm, thiếu tinh thần hợp tác.",
                "en": "Blame-shifting and uncooperative."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "员工社保缴费基数和实际工资有差异，原因是什么？",
            "py": "Yuángōng shèbǎo jiǎofèi jīshù hé shíjì gōngzī yǒu chāyì, yuányīn shì shénme?",
            "vi": "Mức đóng bảo hiểm xã hội của nhân viên có chênh lệch so với lương thực tế, nguyên nhân là gì?",
            "en": "There is a gap between employees' social insurance contribution base and actual pay. What is the reason?"
          },
          "choices": [
            {
              "t": {
                "zh": "差异主要是因为部分员工中途调薪，缴费基数按规定在固定时间统一调整。具体明细我整理成表格给您。",
                "py": "Chāyì zhǔyào shì yīnwèi bùfèn yuángōng zhōngtú diàoxīn, jiǎofèi jīshù àn guīdìng zài gùdìng shíjiān tǒngyì tiáozhěng. Jùtǐ míngxì wǒ zhěnglǐ chéng biǎogé gěi nín.",
                "vi": "Chênh lệch chủ yếu do một số nhân viên được điều chỉnh lương giữa kỳ, mức đóng theo quy định được điều chỉnh đồng loạt vào thời điểm cố định. Tôi sẽ tổng hợp bảng chi tiết cho ông.",
                "en": "The gap is mainly because some employees had mid-period raises, and the contribution base is adjusted together at a fixed time under the rules. I will put the details in a table for you."
              },
              "good": true,
              "feedback": {
                "vi": "Giải thích hợp lý, nêu cơ sở chung và hứa đưa bảng chi tiết.",
                "en": "A reasonable explanation, cites the general rule and promises a detailed table."
              }
            },
            {
              "t": {
                "zh": "社保基数都是这样，每家公司都一样。",
                "py": "Shèbǎo jīshù dōu shì zhèyàng, měi jiā gōngsī dōu yíyàng.",
                "vi": "Mức đóng bảo hiểm xã hội đều như vậy, công ty nào cũng giống nhau.",
                "en": "Contribution bases are always like this; every company is the same."
              },
              "good": false,
              "feedback": {
                "vi": "Nói chung chung, không trả lời câu hỏi cụ thể.",
                "en": "Generic; does not answer the specific question."
              }
            },
            {
              "t": {
                "zh": "对，我们是少缴了一部分，您别告诉别人。",
                "py": "Duì, wǒmen shì shǎo jiǎo le yí bùfèn, nín bié gàosù biérén.",
                "vi": "Đúng, chúng tôi có đóng thiếu một phần, ông đừng nói với ai.",
                "en": "Yes, we underpaid part of it; please do not tell anyone."
              },
              "good": false,
              "feedback": {
                "vi": "Thừa nhận bừa và nhờ che giấu, vi phạm đạo đức nghề nghiệp.",
                "en": "Admits it loosely and asks for a cover-up; unethical."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "请在周五之前补充提交这些材料，可以吗？",
            "py": "Qǐng zài zhōuwǔ zhīqián bǔchōng tíjiāo zhèxiē cáiliào, kěyǐ ma?",
            "vi": "Xin bổ sung những tài liệu này trước thứ Sáu, được không?",
            "en": "Please submit these materials before Friday. Is that possible?"
          },
          "choices": [
            {
              "t": {
                "zh": "可以，我们会在周五之前把补充材料发到您的邮箱，如果有困难我会提前告诉您。",
                "py": "Kěyǐ, wǒmen huì zài zhōuwǔ zhīqián bǎ bǔchōng cáiliào fā dào nín de yóuxiāng, rúguǒ yǒu kùnnán wǒ huì tíqián gàosù nín.",
                "vi": "Được, trước thứ Sáu chúng tôi sẽ gửi tài liệu bổ sung vào email của ông, nếu có khó khăn tôi sẽ báo trước.",
                "en": "Yes, we will email the supplementary materials before Friday, and I will tell you in advance if there is any difficulty."
              },
              "good": true,
              "feedback": {
                "vi": "Cam kết rõ ràng và có kế hoạch dự phòng.",
                "en": "A clear commitment with an early-warning promise."
              }
            },
            {
              "t": {
                "zh": "周五太紧了，我做不到。",
                "py": "Zhōuwǔ tài jǐn le, wǒ zuò bú dào.",
                "vi": "Thứ Sáu gấp quá, tôi không làm được.",
                "en": "Friday is too tight; I cannot do it."
              },
              "good": false,
              "feedback": {
                "vi": "Từ chối thẳng, không đưa phương án thay thế.",
                "en": "Flat refusal with no alternative."
              }
            },
            {
              "t": {
                "zh": "应该可以吧，到时候再说。",
                "py": "Yīnggāi kěyǐ ba, dào shíhòu zài shuō.",
                "vi": "Chắc được, đến lúc đó tính.",
                "en": "Probably, we will see when the time comes."
              },
              "good": false,
              "feedback": {
                "vi": "Mơ hồ, kiểm toán cần hạn chót chắc chắn.",
                "en": "Vague; auditors need a firm deadline."
              }
            }
          ]
        }
      ]
    },
    {
      "kind": "free",
      "opener": {
        "zh": "您好，我是总部的周审计，今天想核对一下工资和奖金的记录。",
        "py": "Nín hǎo, wǒ shì zǒngbù de Zhōu shěnjì, jīntiān xiǎng héduì yíxià gōngzī hé jiǎngjīn de jìlù.",
        "vi": "Chào anh/chị, tôi là kiểm toán viên Chu của tổng bộ, hôm nay muốn đối chiếu hồ sơ lương và thưởng.",
        "en": "Hello, I am Zhou from HQ audit; today I would like to check the pay and bonus records."
      },
      "aiBrief": "Play Auditor Zhou from the Chinese headquarters, a polite but exact person who checks payroll, bonus and overtime records. Use simple business Chinese, ask follow-up questions when answers are vague, and ask for a deadline for any missing material.",
      "goal": {
        "vi": "Trả lời chính xác, dùng chứng từ, nói rõ điều cần xác nhận thêm và chốt hạn nộp bổ sung.",
        "en": "Answer precisely with documents, say what you must confirm, and fix a deadline for supplementary files."
      },
      "tips": [
        {
          "vi": "Nếu không chắc, nói 我需要确认一下 thay vì đoán.",
          "en": "If unsure, say 我需要确认一下 instead of guessing."
        },
        {
          "vi": "Nêu căn cứ: 按照……办法, 审批记录, 考勤记录.",
          "en": "Cite the basis: 按照……办法, 审批记录, 考勤记录."
        },
        {
          "vi": "Kết thúc bằng ngày giao hồ sơ rõ ràng.",
          "en": "End with a clear date for delivering the files."
        }
      ]
    }
  ]
},
{
  "week": 11,
  "block": "roleplay",
  "title": {
    "zh": "与工会代表沟通",
    "vi": "Trao đổi với đại diện công đoàn",
    "en": "Talking with the union representative"
  },
  "goal": {
    "vi": "Trao đổi với đại diện công đoàn về một dự thảo thay đổi: tôn trọng, nói rõ đây mới là dự thảo, lắng nghe lo ngại và hẹn mốc thời gian.",
    "en": "Discuss a draft change with the union representative: be respectful, say it is only a draft, listen to concerns and set a timeline."
  },
  "sessions": [
    {
      "kind": "prep",
      "scenario": {
        "vi": "Công ty đang cân nhắc thay đổi chế độ ca làm việc. Đại diện công đoàn cơ sở (陈代表) đến gặp bạn để hỏi về dự thảo và nêu lo ngại của người lao động.",
        "en": "The company is considering changing the shift system. The workplace union representative (陈代表) comes to ask about the draft and raise employees' concerns."
      },
      "you": {
        "vi": "Đại diện phòng nhân sự, người phụ trách trao đổi",
        "en": "HR representative in charge of the consultation"
      },
      "other": {
        "vi": "Đại diện công đoàn Chen (陈代表)",
        "en": "Union representative Chen (陈代表)"
      },
      "goal": {
        "vi": "Giữ thái độ hợp tác, nói rõ đây là dự thảo, ghi nhận lo ngại của người lao động, không hứa vượt thẩm quyền và hẹn ngày gửi bản sửa đổi.",
        "en": "Stay cooperative, say it is a draft, note employees' concerns, promise nothing beyond your authority, and set a date for the revised plan."
      },
      "phrases": [
        {
          "zh": "感谢工会一直以来的支持与配合。",
          "py": "Gǎnxiè gōnghuì yìzhí yǐlái de zhīchí yǔ pèihé.",
          "vi": "Cảm ơn công đoàn đã luôn ủng hộ và phối hợp.",
          "en": "Thank the union for its continued support and cooperation."
        },
        {
          "zh": "公司想先听听工会和员工代表的意见。",
          "py": "Gōngsī xiǎng xiān tīngting gōnghuì hé yuángōng dàibiǎo de yìjiàn.",
          "vi": "Công ty muốn nghe trước ý kiến của công đoàn và đại diện người lao động.",
          "en": "The company would like to hear the views of the union and employee representatives first."
        },
        {
          "zh": "这个方案还只是草案，没有最终决定。",
          "py": "Zhège fāngàn hái zhǐshì cǎoàn, méiyǒu zuìzhōng juédìng.",
          "vi": "Phương án này mới chỉ là dự thảo, chưa quyết định cuối cùng.",
          "en": "This plan is only a draft; nothing is final."
        },
        {
          "zh": "我们会按规定和工会协商，并听取员工的意见。",
          "py": "Wǒmen huì àn guīdìng hé gōnghuì xiéshāng, bìng tīngqǔ yuángōng de yìjiàn.",
          "vi": "Chúng tôi sẽ trao đổi với công đoàn theo quy định và lắng nghe ý kiến người lao động.",
          "en": "We will consult the union as required and listen to employees' views."
        },
        {
          "zh": "员工最关心的问题是什么？",
          "py": "Yuángōng zuì guānxīn de wèntí shì shénme?",
          "vi": "Vấn đề người lao động quan tâm nhất là gì?",
          "en": "What are the employees most concerned about?"
        },
        {
          "zh": "我们会把您的建议带到管理层会议上。",
          "py": "Wǒmen huì bǎ nín de jiànyì dàidào guǎnlǐcéng huìyì shàng.",
          "vi": "Chúng tôi sẽ mang đề xuất của ông đến cuộc họp ban quản lý.",
          "en": "We will take your suggestions to the management meeting."
        },
        {
          "zh": "方案确定后，会提前通知全体员工。",
          "py": "Fāngàn quèdìng hòu, huì tíqián tōngzhī quántǐ yuángōng.",
          "vi": "Sau khi phương án được xác định sẽ thông báo trước cho toàn thể nhân viên.",
          "en": "Once the plan is settled, all employees will be notified in advance."
        },
        {
          "zh": "双方都希望找到一个合理的办法。",
          "py": "Shuāngfāng dōu xīwàng zhǎodào yí gè hélǐ de bànfǎ.",
          "vi": "Hai bên đều mong tìm được một giải pháp hợp lý.",
          "en": "Both sides hope to find a reasonable solution."
        }
      ]
    },
    {
      "kind": "script",
      "turns": [
        {
          "other": {
            "zh": "听说公司准备调整轮班制度，为什么没有先通知工会？",
            "py": "Tīngshuō gōngsī zhǔnbèi tiáozhěng lúnbān zhìdù, wèishénme méiyǒu xiān tōngzhī gōnghuì?",
            "vi": "Nghe nói công ty định điều chỉnh chế độ làm theo ca, sao không báo công đoàn trước?",
            "en": "I hear the company plans to change the shift system. Why was the union not told first?"
          },
          "choices": [
            {
              "t": {
                "zh": "这是公司管理层的决定，不需要通知工会。",
                "py": "Zhè shì gōngsī guǎnlǐcéng de juédìng, bù xūyào tōngzhī gōnghuì.",
                "vi": "Đây là quyết định của ban quản lý, không cần báo công đoàn.",
                "en": "This is a management decision; the union does not need to be told."
              },
              "good": false,
              "feedback": {
                "vi": "Coi thường vai trò công đoàn và có thể trái quy định tham vấn.",
                "en": "Dismisses the union's role and may conflict with consultation rules."
              }
            },
            {
              "t": {
                "zh": "对不起，让您担心了。目前只是草案，我们今天正想先听听工会的意见。",
                "py": "Duìbuqǐ, ràng nín dānxīn le. Mùqián zhǐshì cǎoàn, wǒmen jīntiān zhèng xiǎng xiān tīngting gōnghuì de yìjiàn.",
                "vi": "Xin lỗi đã làm ông lo lắng. Hiện mới là dự thảo, hôm nay chúng tôi đang muốn nghe ý kiến công đoàn trước.",
                "en": "I am sorry to have worried you. It is only a draft for now, and we wanted to hear the union's views today."
              },
              "good": true,
              "feedback": {
                "vi": "Xin lỗi, nói thật tình trạng và mời góp ý.",
                "en": "Apologises, states the true status and invites input."
              }
            },
            {
              "t": {
                "zh": "没有这回事，您听错了。",
                "py": "Méiyǒu zhè huíshì, nín tīng cuò le.",
                "vi": "Không có chuyện này, ông nghe nhầm rồi.",
                "en": "That is not true; you heard wrong."
              },
              "good": false,
              "feedback": {
                "vi": "Nói dối khi thực tế có dự thảo, mất lòng tin.",
                "en": "Denies a real draft; destroys trust."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "员工们担心夜班增多，休息时间会减少。",
            "py": "Yuángōng men dānxīn yèbān zēngduō, xiūxī shíjiān huì jiǎnshǎo.",
            "vi": "Người lao động lo ca đêm tăng lên, thời gian nghỉ ngơi sẽ giảm.",
            "en": "Employees worry that night shifts will increase and rest time will be cut."
          },
          "choices": [
            {
              "t": {
                "zh": "不会减少的，您让大家放心。",
                "py": "Bú huì jiǎnshǎo de, nín ràng dàjiā fàngxīn.",
                "vi": "Sẽ không giảm đâu, ông cứ bảo mọi người yên tâm.",
                "en": "It will not be cut; tell everyone not to worry."
              },
              "good": false,
              "feedback": {
                "vi": "Hứa tuyệt đối khi dự thảo chưa chốt.",
                "en": "An absolute promise on an unfinished draft."
              }
            },
            {
              "t": {
                "zh": "这个担忧很重要。我会记下来，方案会考虑员工的休息时间，也会符合劳动法规的规定。",
                "py": "Zhège dānyōu hěn zhòngyào. Wǒ huì jì xiàlái, fāngàn huì kǎolǜ yuángōng de xiūxī shíjiān, yě huì fúhé láodòng fǎguī de guīdìng.",
                "vi": "Lo ngại này rất quan trọng. Tôi sẽ ghi lại, phương án sẽ cân nhắc thời gian nghỉ của người lao động và phù hợp quy định pháp luật lao động.",
                "en": "That concern matters. I will note it; the plan will consider employees' rest time and comply with labour regulations."
              },
              "good": true,
              "feedback": {
                "vi": "Ghi nhận và cam kết ở mức vừa phải, không hứa cụ thể quá mức.",
                "en": "Acknowledges and commits at a sensible level without over-promising."
              }
            },
            {
              "t": {
                "zh": "工作需要，员工应该服从安排。",
                "py": "Gōngzuò xūyào, yuángōng yīnggāi fúcóng ānpái.",
                "vi": "Do nhu cầu công việc, nhân viên nên phục tùng sắp xếp.",
                "en": "Work requires it; employees should follow the arrangement."
              },
              "good": false,
              "feedback": {
                "vi": "Gạt bỏ lo ngại chính đáng, dễ gây căng thẳng.",
                "en": "Brushes off a legitimate concern and invites conflict."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "我们希望在方案正式实施前，能参与讨论。",
            "py": "Wǒmen xīwàng zài fāngàn zhèngshì shíshī qián, néng cānyù tǎolùn.",
            "vi": "Chúng tôi mong trước khi phương án chính thức thực hiện được tham gia thảo luận.",
            "en": "We hope to take part in the discussion before the plan is formally implemented."
          },
          "choices": [
            {
              "t": {
                "zh": "讨论会时间很难安排，您等通知吧。",
                "py": "Tǎolùnhuì shíjiān hěn nán ānpái, nín děng tōngzhī ba.",
                "vi": "Buổi thảo luận khó xếp lịch, ông chờ thông báo đi.",
                "en": "A meeting is hard to schedule; wait for a notice."
              },
              "good": false,
              "feedback": {
                "vi": "Trì hoãn, không cam kết cơ hội tham gia.",
                "en": "Stalls and gives no real chance to take part."
              }
            },
            {
              "t": {
                "zh": "您提供书面意见就行了，不用来讨论。",
                "py": "Nín tígōng shūmiàn yìjiàn jiù xíng le, bú yòng lái tǎolùn.",
                "vi": "Ông gửi ý kiến bằng văn bản là được, không cần đến thảo luận.",
                "en": "Just send written comments; there is no need to come and discuss."
              },
              "good": false,
              "feedback": {
                "vi": "Từ chối đối thoại trực tiếp, trái với tinh thần tham vấn.",
                "en": "Refuses direct dialogue, against the spirit of consultation."
              }
            },
            {
              "t": {
                "zh": "当然可以。我们会按规定与工会协商，也欢迎您带员工代表一起参加讨论会。",
                "py": "Dāngrán kěyǐ. Wǒmen huì àn guīdìng yǔ gōnghuì xiéshāng, yě huānyíng nín dài yuángōng dàibiǎo yìqǐ cānjiā tǎolùnhuì.",
                "vi": "Tất nhiên được. Chúng tôi sẽ trao đổi với công đoàn theo quy định, cũng hoan nghênh ông dẫn đại diện nhân viên cùng dự buổi thảo luận.",
                "en": "Of course. We will consult the union as required, and you are welcome to bring employee representatives to the discussion."
              },
              "good": true,
              "feedback": {
                "vi": "Chào đón sự tham gia và nêu đúng tinh thần quy định.",
                "en": "Welcomes participation in line with the rules."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "如果员工不同意新的方案，公司会怎么办？",
            "py": "Rúguǒ yuángōng bù tóngyì xīn de fāngàn, gōngsī huì zěnme bàn?",
            "vi": "Nếu người lao động không đồng ý phương án mới, công ty sẽ làm thế nào?",
            "en": "If employees do not agree with the new plan, what will the company do?"
          },
          "choices": [
            {
              "t": {
                "zh": "不同意也没用，总部已经定了。",
                "py": "Bù tóngyì yě méiyòng, zǒngbù yǐjīng dìng le.",
                "vi": "Không đồng ý cũng vô ích, tổng bộ đã quyết rồi.",
                "en": "Disagreeing is pointless; HQ has already decided."
              },
              "good": false,
              "feedback": {
                "vi": "Mâu thuẫn với việc nói đây là dự thảo và làm mất lòng tin.",
                "en": "Contradicts the claim that it is a draft and kills trust."
              }
            },
            {
              "t": {
                "zh": "我们会认真听取意见，必要时调整方案，不会在没有充分沟通的情况下强行实施。",
                "py": "Wǒmen huì rènzhēn tīngqǔ yìjiàn, bìyào shí tiáozhěng fāngàn, bú huì zài méiyǒu chōngfèn gōutōng de qíngkuàng xià qiángxíng shíshī.",
                "vi": "Chúng tôi sẽ lắng nghe nghiêm túc, khi cần sẽ điều chỉnh phương án, không cưỡng ép thực hiện khi chưa trao đổi đầy đủ.",
                "en": "We will listen carefully, adjust the plan if necessary, and not force it through without full communication."
              },
              "good": true,
              "feedback": {
                "vi": "Cam kết quy trình tôn trọng nhưng không hứa kết quả.",
                "en": "Commits to a respectful process without promising an outcome."
              }
            },
            {
              "t": {
                "zh": "不同意的人可以自己选择离开。",
                "py": "Bù tóngyì de rén kěyǐ zìjǐ xuǎnzé líkāi.",
                "vi": "Ai không đồng ý có thể tự chọn rời đi.",
                "en": "Whoever disagrees can choose to leave."
              },
              "good": false,
              "feedback": {
                "vi": "Mang tính ép buộc, không phù hợp khi làm việc với công đoàn.",
                "en": "Coercive; wrong tone with a union."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "那什么时候可以看到修改后的方案？",
            "py": "Nà shénme shíhòu kěyǐ kàndào xiūgǎi hòu de fāngàn?",
            "vi": "Vậy khi nào có thể xem phương án đã sửa?",
            "en": "So when can we see the revised plan?"
          },
          "choices": [
            {
              "t": {
                "zh": "等有消息再说吧。",
                "py": "Děng yǒu xiāoxī zài shuō ba.",
                "vi": "Có tin rồi nói sau.",
                "en": "We will talk when there is news."
              },
              "good": false,
              "feedback": {
                "vi": "Không có mốc thời gian, công đoàn không có gì để báo lại.",
                "en": "No timeline; the union has nothing to report back."
              }
            },
            {
              "t": {
                "zh": "这个我不能告诉您。",
                "py": "Zhège wǒ bù néng gàosù nín.",
                "vi": "Việc này tôi không thể nói với ông.",
                "en": "I cannot tell you that."
              },
              "good": false,
              "feedback": {
                "vi": "Đóng cửa thông tin, đi ngược tinh thần hợp tác.",
                "en": "Shuts down information; against cooperation."
              }
            },
            {
              "t": {
                "zh": "我们争取下个月初把修改后的方案发给您，并提前通知全体员工。",
                "py": "Wǒmen zhēngqǔ xià gè yuè chū bǎ xiūgǎi hòu de fāngàn fā gěi nín, bìng tíqián tōngzhī quántǐ yuángōng.",
                "vi": "Chúng tôi cố gắng đầu tháng sau gửi phương án đã sửa cho ông và thông báo trước cho toàn thể nhân viên.",
                "en": "We will aim to send you the revised plan early next month and notify all employees in advance."
              },
              "good": true,
              "feedback": {
                "vi": "Có mốc thời gian mềm, đúng thẩm quyền và hứa thông báo.",
                "en": "A soft but concrete timeline within your authority."
              }
            }
          ]
        }
      ]
    },
    {
      "kind": "free",
      "opener": {
        "zh": "您好，我是工会的陈代表。听说公司要调整轮班制度，我想了解一下。",
        "py": "Nín hǎo, wǒ shì gōnghuì de Chén dàibiǎo. Tīngshuō gōngsī yào tiáozhěng lúnbān zhìdù, wǒ xiǎng liǎojiě yíxià.",
        "vi": "Chào anh/chị, tôi là Chen, đại diện công đoàn. Nghe nói công ty sắp điều chỉnh chế độ ca, tôi muốn tìm hiểu.",
        "en": "Hello, I am Chen, the union representative. I hear the company will change the shift system and would like to know more."
      },
      "aiBrief": "Play Chen, a workplace union representative at a Chinese-owned company in Vietnam. Use simple business Chinese. You are polite but firm: you want to be consulted early, you voice employees' worries about rest time and night shifts, and you ask for a timeline.",
      "goal": {
        "vi": "Nói rõ đây là dự thảo, lắng nghe lo ngại, mời tham gia thảo luận và hẹn mốc gửi bản sửa đổi.",
        "en": "Say it is a draft, listen to concerns, invite participation and set a date for the revised plan."
      },
      "tips": [
        {
          "vi": "Dùng 草案 để nói đây chưa phải quyết định cuối cùng.",
          "en": "Use 草案 to show nothing is final."
        },
        {
          "vi": "Dùng 听取意见 và 协商 thay vì 通知 khi nói về công đoàn.",
          "en": "Use 听取意见 and 协商 rather than 通知 when speaking about the union."
        },
        {
          "vi": "Tránh hứa tuyệt đối như 不会减少; hãy nói 会考虑.",
          "en": "Avoid absolute promises like 不会减少; say 会考虑."
        }
      ]
    }
  ]
},
{
  "week": 12,
  "block": "roleplay",
  "title": {
    "zh": "与总部视频会议：人员预算",
    "vi": "Họp video với tổng bộ: ngân sách nhân sự",
    "en": "Video call with HQ: headcount budget"
  },
  "goal": {
    "vi": "Trình bày số liệu biên chế và ngân sách nhân sự với tổng bộ qua video: rõ ràng, có dữ liệu, đề xuất phương án và gửi biên bản sau họp.",
    "en": "Present headcount and personnel budget figures to HQ on video: clear, data-backed, with a proposal and a follow-up email."
  },
  "sessions": [
    {
      "kind": "prep",
      "scenario": {
        "vi": "Bạn họp video với Lý giám đốc nhân sự (李总监) của tổng bộ để đề xuất tăng biên chế và ngân sách nhân sự năm nay. Các số liệu dưới đây chỉ là ví dụ giả định.",
        "en": "You join a video call with HQ HR director Li (李总监) to propose more headcount and personnel budget this year. The figures below are fictional examples."
      },
      "you": {
        "vi": "Đại diện nhân sự công ty con trình bày",
        "en": "Subsidiary HR representative presenting"
      },
      "other": {
        "vi": "Lý giám đốc nhân sự (李总监) của tổng bộ",
        "en": "HQ HR director Li (李总监)"
      },
      "goal": {
        "vi": "Trình bày bằng số liệu, giải thích lý do tăng biên chế, đề xuất phương án chia đợt và hẹn gửi tài liệu sau họp.",
        "en": "Present with numbers, explain the need for more headcount, propose a phased approval, and promise post-meeting documents."
      },
      "phrases": [
        {
          "zh": "信号不太稳定，我把重点再说一遍。",
          "py": "Xìnhào bú tài wěndìng, wǒ bǎ zhòngdiǎn zài shuō yí biàn.",
          "vi": "Tín hiệu không ổn định lắm, tôi nhắc lại phần trọng tâm.",
          "en": "The signal is unstable; let me repeat the key points."
        },
        {
          "zh": "请问您能听到我的声音吗？",
          "py": "Qǐngwèn nín néng tīngdào wǒ de shēngyīn ma?",
          "vi": "Xin hỏi ông có nghe thấy tôi không?",
          "en": "Can you hear me?"
        },
        {
          "zh": "我共享一下屏幕，大家看一下这张表。",
          "py": "Wǒ gòngxiǎng yíxià píngmù, dàjiā kàn yíxià zhè zhāng biǎo.",
          "vi": "Tôi chia sẻ màn hình một chút, mọi người xem bảng này.",
          "en": "I will share my screen; please look at this table."
        },
        {
          "zh": "今年的人员预算比去年增加了百分之八。",
          "py": "Jīnnián de rényuán yùsuàn bǐ qùnián zēngjiā le bǎifēnzhī bā.",
          "vi": "Ngân sách nhân sự năm nay tăng tám phần trăm so với năm ngoái.",
          "en": "This year's personnel budget is eight percent higher than last year's."
        },
        {
          "zh": "新增编制主要集中在研发和销售部门。",
          "py": "Xīnzēng biānzhì zhǔyào jízhōng zài yánfā hé xiāoshòu bùmén.",
          "vi": "Biên chế mới chủ yếu tập trung ở bộ phận nghiên cứu phát triển và kinh doanh.",
          "en": "The new headcount is mainly in R and D and sales."
        },
        {
          "zh": "如果招聘延迟，人员成本会低于预算。",
          "py": "Rúguǒ zhāopìn yánchí, rényuán chéngběn huì dīyú yùsuàn.",
          "vi": "Nếu tuyển dụng chậm, chi phí nhân sự sẽ thấp hơn ngân sách.",
          "en": "If hiring is delayed, personnel cost will come in under budget."
        },
        {
          "zh": "我们需要总部批准这三个新增岗位。",
          "py": "Wǒmen xūyào zǒngbù pīzhǔn zhè sān gè xīnzēng gǎngwèi.",
          "vi": "Chúng tôi cần tổng bộ phê duyệt ba vị trí mới này.",
          "en": "We need HQ to approve these three new positions."
        },
        {
          "zh": "会后我把会议纪要和数据表发给您。",
          "py": "Huìhòu wǒ bǎ huìyì jìyào hé shùjùbiǎo fā gěi nín.",
          "vi": "Sau họp tôi sẽ gửi biên bản và bảng số liệu cho ông.",
          "en": "After the meeting I will send you the minutes and the data table."
        }
      ]
    },
    {
      "kind": "script",
      "turns": [
        {
          "other": {
            "zh": "大家好，我们开始吧。先请你介绍一下今年子公司的人员编制情况。",
            "py": "Dàjiā hǎo, wǒmen kāishǐ ba. Xiān qǐng nǐ jièshào yíxià jīnnián zǐgōngsī de rényuán biānzhì qíngkuàng.",
            "vi": "Chào mọi người, ta bắt đầu nhé. Trước hết mời bạn giới thiệu tình hình biên chế công ty con năm nay.",
            "en": "Hello everyone, let us begin. First, please introduce this year's headcount situation at the subsidiary."
          },
          "choices": [
            {
              "t": {
                "zh": "我还没准备好，能不能下次再说？",
                "py": "Wǒ hái méi zhǔnbèi hǎo, néng bù néng xià cì zài shuō?",
                "vi": "Tôi chưa chuẩn bị xong, lần sau nói được không?",
                "en": "I am not ready yet; can we do this next time?"
              },
              "good": false,
              "feedback": {
                "vi": "Thiếu chuẩn bị trước cấp trên tổng bộ.",
                "en": "Unprepared in front of HQ."
              }
            },
            {
              "t": {
                "zh": "好的，李总监。我共享一下屏幕。目前在职员工两百人，今年计划新增十五个编制。",
                "py": "Hǎo de, Lǐ zǒngjiān. Wǒ gòngxiǎng yíxià píngmù. Mùqián zàizhí yuángōng liǎng bǎi rén, jīnnián jìhuà xīnzēng shíwǔ gè biānzhì.",
                "vi": "Vâng, giám đốc Lý. Tôi chia sẻ màn hình. Hiện có hai trăm nhân viên đang làm việc, năm nay dự kiến thêm mười lăm biên chế.",
                "en": "Yes, Director Li. Let me share my screen. We currently have 200 employees and plan to add 15 positions this year."
              },
              "good": true,
              "feedback": {
                "vi": "Mở đầu rõ, có số liệu và dùng đúng công cụ họp video.",
                "en": "A clear start with numbers and proper use of the video tool."
              }
            },
            {
              "t": {
                "zh": "人很多，也不少，大概就是那样。",
                "py": "Rén hěn duō, yě bù shǎo, dàgài jiù shì nàyàng.",
                "vi": "Người đông, cũng không ít, đại khái là vậy.",
                "en": "There are many people, not few, roughly like that."
              },
              "good": false,
              "feedback": {
                "vi": "Mơ hồ, không có con số nào.",
                "en": "Vague; not a single figure."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "为什么要新增十五个编制？业务增长有数据支持吗？",
            "py": "Wèishénme yào xīnzēng shíwǔ gè biānzhì? Yèwù zēngzhǎng yǒu shùjù zhīchí ma?",
            "vi": "Tại sao cần thêm mười lăm biên chế? Tăng trưởng kinh doanh có số liệu chứng minh không?",
            "en": "Why add 15 positions? Is business growth backed by data?"
          },
          "choices": [
            {
              "t": {
                "zh": "因为各部门都说人手不够。",
                "py": "Yīnwèi gè bùmén dōu shuō rénshǒu bú gòu.",
                "vi": "Vì các bộ phận đều nói thiếu người.",
                "en": "Because every department says it is short-staffed."
              },
              "good": false,
              "feedback": {
                "vi": "Chỉ là ý kiến, không có dữ liệu.",
                "en": "Only opinions, no data."
              }
            },
            {
              "t": {
                "zh": "总部去年答应过的，现在应该批准。",
                "py": "Zǒngbù qùnián dāyìng guò de, xiànzài yīnggāi pīzhǔn.",
                "vi": "Năm ngoái tổng bộ đã hứa, bây giờ nên phê duyệt.",
                "en": "HQ promised last year, so it should approve it now."
              },
              "good": false,
              "feedback": {
                "vi": "Đòi hỏi, thiếu lập luận và gây khó chịu.",
                "en": "Demanding, no argument, and irritating."
              }
            },
            {
              "t": {
                "zh": "主要是因为订单增长，研发和销售的工作量明显增加。我把近三个季度的数据放在第二页。",
                "py": "Zhǔyào shì yīnwèi dìngdān zēngzhǎng, yánfā hé xiāoshòu de gōngzuòliàng míngxiǎn zēngjiā. Wǒ bǎ jìn sān gè jìdù de shùjù fàng zài dìèr yè.",
                "vi": "Chủ yếu do đơn hàng tăng, khối lượng công việc ở nghiên cứu phát triển và kinh doanh tăng rõ rệt. Số liệu ba quý gần nhất tôi để ở trang hai.",
                "en": "Mainly because orders are growing and workload in R and D and sales has clearly increased. The last three quarters' data is on page two."
              },
              "good": true,
              "feedback": {
                "vi": "Nêu lý do kinh doanh và dẫn chứng bằng số liệu.",
                "en": "Gives the business reason and points to supporting data."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "人员成本预算比去年高多少？",
            "py": "Rényuán chéngběn yùsuàn bǐ qùnián gāo duōshǎo?",
            "vi": "Ngân sách chi phí nhân sự cao hơn năm ngoái bao nhiêu?",
            "en": "How much higher is the personnel cost budget than last year?"
          },
          "choices": [
            {
              "t": {
                "zh": "具体数字我不记得了。",
                "py": "Jùtǐ shùzì wǒ bú jìde le.",
                "vi": "Con số cụ thể tôi không nhớ.",
                "en": "I do not remember the exact figure."
              },
              "good": false,
              "feedback": {
                "vi": "Không nắm số liệu chính trong cuộc họp ngân sách.",
                "en": "You must know the key figure in a budget meeting."
              }
            },
            {
              "t": {
                "zh": "增加得不多，不用担心。",
                "py": "Zēngjiā de bù duō, bú yòng dānxīn.",
                "vi": "Tăng không nhiều, không cần lo.",
                "en": "It is not much; no need to worry."
              },
              "good": false,
              "feedback": {
                "vi": "Mơ hồ và hơi chủ quan.",
                "en": "Vague and a little dismissive."
              }
            },
            {
              "t": {
                "zh": "总预算比去年增加约百分之八，其中新增编制占一半左右，其余是调薪和社保成本的变化。",
                "py": "Zǒng yùsuàn bǐ qùnián zēngjiā yuē bǎifēnzhī bā, qízhōng xīnzēng biānzhì zhàn yíbàn zuǒyòu, qíyú shì diàoxīn hé shèbǎo chéngběn de biànhuà.",
                "vi": "Tổng ngân sách tăng khoảng tám phần trăm so với năm ngoái, trong đó biên chế mới chiếm khoảng một nửa, phần còn lại là thay đổi do điều chỉnh lương và chi phí bảo hiểm xã hội.",
                "en": "The total budget is up about eight percent; new headcount accounts for roughly half, and the rest comes from raises and social insurance cost changes."
              },
              "good": true,
              "feedback": {
                "vi": "Có con số và cơ cấu, nói rõ là ước chừng.",
                "en": "Gives a figure and a breakdown, flagged as approximate."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "预算有限，能不能先批准一部分？",
            "py": "Yùsuàn yǒuxiàn, néng bù néng xiān pīzhǔn yí bùfèn?",
            "vi": "Ngân sách có hạn, có thể phê duyệt trước một phần không?",
            "en": "The budget is limited; can we approve only part of it first?"
          },
          "choices": [
            {
              "t": {
                "zh": "不行，十五个必须全部批准，否则业务做不下去。",
                "py": "Bù xíng, shíwǔ gè bìxū quánbù pīzhǔn, fǒuzé yèwù zuò bú xiàqù.",
                "vi": "Không được, mười lăm vị trí phải duyệt hết, nếu không kinh doanh không làm được.",
                "en": "No, all 15 must be approved, otherwise the business cannot continue."
              },
              "good": false,
              "feedback": {
                "vi": "Cứng nhắc và hơi đe dọa trước tổng bộ.",
                "en": "Rigid and sounds like an ultimatum to HQ."
              }
            },
            {
              "t": {
                "zh": "您说了算，批多少都可以。",
                "py": "Nín shuō le suàn, pī duōshǎo dōu kěyǐ.",
                "vi": "Ông quyết định, duyệt bao nhiêu cũng được.",
                "en": "It is up to you; any number is fine."
              },
              "good": false,
              "feedback": {
                "vi": "Thiếu lập trường, bỏ nhu cầu thực của công ty.",
                "en": "No position; drops the company's real needs."
              }
            },
            {
              "t": {
                "zh": "可以。我们建议分两批：先批准研发的八个岗位，其余的根据上半年业绩再决定。",
                "py": "Kěyǐ. Wǒmen jiànyì fēn liǎng pī: xiān pīzhǔn yánfā de bā gè gǎngwèi, qíyú de gēnjù shàngbànnián yèjì zài juédìng.",
                "vi": "Được. Chúng tôi đề xuất chia hai đợt: trước phê duyệt tám vị trí nghiên cứu phát triển, phần còn lại quyết định dựa trên kết quả nửa đầu năm.",
                "en": "Yes. We suggest two batches: first approve the eight R and D positions, and decide the rest based on first-half results."
              },
              "good": true,
              "feedback": {
                "vi": "Linh hoạt, đưa phương án cụ thể và có điều kiện.",
                "en": "Flexible, with a concrete conditional proposal."
              }
            }
          ]
        },
        {
          "other": {
            "zh": "好，会后请把方案和数据表发给我。",
            "py": "Hǎo, huìhòu qǐng bǎ fāngàn hé shùjùbiǎo fā gěi wǒ.",
            "vi": "Được, sau họp hãy gửi phương án và bảng số liệu cho tôi.",
            "en": "OK, after the meeting please send me the proposal and the data table."
          },
          "choices": [
            {
              "t": {
                "zh": "好的，会后一小时内我把会议纪要、方案和数据表一起发给您。谢谢李总监。",
                "py": "Hǎo de, huìhòu yì xiǎoshí nèi wǒ bǎ huìyì jìyào, fāngàn hé shùjùbiǎo yìqǐ fā gěi nín. Xièxie Lǐ zǒngjiān.",
                "vi": "Vâng, trong vòng một giờ sau họp tôi sẽ gửi biên bản, phương án và bảng số liệu cùng lúc cho ông. Cảm ơn giám đốc Lý.",
                "en": "Yes, within an hour after the meeting I will send the minutes, proposal and data table together. Thank you, Director Li."
              },
              "good": true,
              "feedback": {
                "vi": "Có thời hạn rõ ràng và kết thúc lịch sự.",
                "en": "A clear deadline and a polite close."
              }
            },
            {
              "t": {
                "zh": "好的，有时间我发给您。",
                "py": "Hǎo de, yǒu shíjiān wǒ fā gěi nín.",
                "vi": "Vâng, có thời gian tôi gửi ông.",
                "en": "OK, I will send it when I have time."
              },
              "good": false,
              "feedback": {
                "vi": "Không cam kết, thiếu chuyên nghiệp với tổng bộ.",
                "en": "No commitment; unprofessional towards HQ."
              }
            },
            {
              "t": {
                "zh": "发邮件太麻烦了，您在系统里自己看吧。",
                "py": "Fā yóujiàn tài máfán le, nín zài xìtǒng lǐ zìjǐ kàn ba.",
                "vi": "Gửi email phiền quá, ông tự xem trong hệ thống đi.",
                "en": "Sending emails is a hassle; look it up in the system yourself."
              },
              "good": false,
              "feedback": {
                "vi": "Thiếu tôn trọng cấp trên.",
                "en": "Disrespectful to a senior."
              }
            }
          ]
        }
      ]
    },
    {
      "kind": "free",
      "opener": {
        "zh": "大家好，我们开始吧。请你先说说今年的人员预算和新增编制。",
        "py": "Dàjiā hǎo, wǒmen kāishǐ ba. Qǐng nǐ xiān shuōshuo jīnnián de rényuán yùsuàn hé xīnzēng biānzhì.",
        "vi": "Chào mọi người, ta bắt đầu nhé. Mời bạn nói trước về ngân sách nhân sự và biên chế mới năm nay.",
        "en": "Hello everyone, let us begin. Please start with this year's personnel budget and new headcount."
      },
      "aiBrief": "Play Li, an HR director at the Chinese headquarters on a video call. Use simple business Chinese. You are polite but data-driven: ask why new positions are needed, how much the budget grows, and whether part of it can be approved first. End by asking for the minutes and data table.",
      "goal": {
        "vi": "Nêu số liệu, giải thích nhu cầu, đề xuất phương án chia đợt và hẹn gửi tài liệu sau họp.",
        "en": "Give figures, explain the need, propose phasing, and promise documents after the call."
      },
      "tips": [
        {
          "vi": "Nói chậm, câu ngắn; nếu mạng kém hãy dùng 我再说一遍.",
          "en": "Speak slowly in short sentences; if the line is bad, use 我再说一遍."
        },
        {
          "vi": "Mỗi ý chính kèm một con số hoặc một trang dữ liệu.",
          "en": "Back each main point with a number or a data page."
        },
        {
          "vi": "Kết thúc bằng 会后……内发给您 để có thời hạn rõ ràng.",
          "en": "Close with 会后……内发给您 to give a clear deadline."
        }
      ]
    }
  ]
}
);
