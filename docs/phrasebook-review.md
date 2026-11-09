# HR phrasebook: second-check results

`data/phrasebook.js` has 80 messages (payroll 12, leave 12, offers 10, policy 12, meetings 12, problems 12, everyday 10).
One AI pass wrote them; a second, separate AI pass checked every message (Chinese, pinyin, Vietnamese, English, and
whether it fits Vietnamese HR practice). Result: **72 fine, 4 fixed, 4 doubtful**. Every message stays `checked: false`
until a teacher has read it. The app shows a "not yet checked by a teacher" note on the phrasebook screen.

## Doubtful (left as written, marked `doubt: true`, shown as "under review" in the app)

A teacher should decide these.

| id | Chinese | Concern |
|---|---|---|
| pb-008 | 年底要做个税结算，请在[日期]前提交家庭减免的相关材料。 | 家庭减免 is not a standard term; Vietnamese 'giảm trừ gia cảnh' is usually 家庭情况扣除 (or 家庭扣除). Also, annual PIT finalization in Vietnam is done after the year ends (by end of Q1), so 年底要做 / 'Cuoi nam' is loose. A teacher should confirm the wording. |
| pb-033 | 恭喜您顺利通过试用期，从[日期]起正式转正。 | en 'permanent employee' for 转正 may suggest an indefinite-term contract, which is not always true in Vietnam. 'regular/official employee' is safer. |
| pb-073 | 您好，想跟进一下昨天发的邮件，您有时间看了吗？ | 您有时间看了吗 is slightly awkward; 您看了吗 or 不知道您是否有时间看一下 reads more naturally to a manager. |
| pb-077 | 不好意思，我没太听懂，您能再说明一下吗？ | 听懂 implies spoken input; for written messages 没太明白 or 没太看懂 fits better. |

## Fixed by the second check (already applied)

| id | Field | Was | Now | Why |
|---|---|---|---|---|
| pb-027 | vi | Thời gian thử việc của bạn là [số ngày] ngày, sau khi kết thúc chúng tôi sẽ sắp xếp đánh giá để ký hợp đồng chính thức. | Thời gian thử việc của bạn là [số ngày] ngày, sau khi kết thúc thử việc chúng tôi sẽ sắp xếp đánh giá chuyển chính thức. | vi adds 'ký hợp đồng chính thức' (sign an official contract), which the Chinese does not say. In Vietnam, probation can also be part of the labor contract itself. |
| pb-045 | en | Some colleagues have recently forgotten to clock in. Please remember to clock in and out every day. | Some colleagues have recently forgotten to clock in. Please remember to clock in and out when you arrive and leave. | en adds 'every day', which is not in the Chinese; 上下班 means when arriving and when leaving. |
| pb-065 | title.vi | Rủi ro nghỉ việc hàng loạt | Rủi ro mất nhân sự | title.vi 'nghỉ việc hàng loạt' (mass resignation) overstates the message and en title 'Turnover risk'. |
| pb-075 | vi | Xin lỗi vì phản hồi muộn, mấy hôm nay tôi bận quyết toán cuối tháng. | Xin lỗi vì phản hồi muộn, mấy hôm nay tôi bận chốt số liệu cuối tháng. | vi 'quyết toán' usually means annual (tax) finalization; 月底结算 / month-end closing is 'chốt số liệu/khóa sổ cuối tháng'. |

## How to mark a message as checked

Set `"checked": true` on its line in `data/phrasebook.js` (and remove `"doubt": true` if present). Keep the id.
