#!/usr/bin/env python3
"""Generate four editable .docx resumes with natural, less AI-like wording."""

from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

OUT = Path(__file__).resolve().parent / "docx"


def set_run_font(run, name_cn="微软雅黑", name_en="Calibri", size=10.5, bold=False, color=None):
    run.bold = bold
    run.font.size = Pt(size)
    run.font.name = name_en
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name_cn)
    if color is not None:
        run.font.color.rgb = color


def set_para(p, before=0, after=2, line=1.15, align=None):
    pf = p.paragraph_format
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line
    if align is not None:
        pf.alignment = align


def add_heading_bar(doc, text):
    p = doc.add_paragraph()
    set_para(p, before=8, after=2, line=1.1)
    run = p.add_run(text)
    set_run_font(run, size=12, bold=True)
    # underline via bottom border on paragraph
    pPr = p._p.get_or_add_pPr()
    pBdr = pPr.makeelement(qn("w:pBdr"), {})
    bottom = pBdr.makeelement(
        qn("w:bottom"),
        {
            qn("w:val"): "single",
            qn("w:sz"): "12",
            qn("w:space"): "1",
            qn("w:color"): "222222",
        },
    )
    pBdr.append(bottom)
    pPr.append(pBdr)


def add_center(doc, text, size=10.5, bold=False, before=0, after=2):
    p = doc.add_paragraph()
    set_para(p, before=before, after=after, align=WD_ALIGN_PARAGRAPH.CENTER)
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold)
    return p


def add_line(doc, text, size=10.5, bold=False, before=0, after=2, color=None):
    p = doc.add_paragraph()
    set_para(p, before=before, after=after)
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, color=color)
    return p


def add_job_head(doc, left, right, size=10.5):
    p = doc.add_paragraph()
    set_para(p, before=5, after=1)
    r1 = p.add_run(left)
    set_run_font(r1, size=size, bold=True)
    # tab-ish spacing with spaces then right date on same line via flush
    r2 = p.add_run("\t" + right)
    set_run_font(r2, size=size - 0.5, bold=False, color=RGBColor(0x55, 0x55, 0x55))
    # set right tab stop roughly at page edge
    from docx.enum.text import WD_TAB_ALIGNMENT
    from docx.shared import Twips

    p.paragraph_format.tab_stops.add_tab_stop(Cm(16.5), WD_TAB_ALIGNMENT.RIGHT)
    return p


def add_bullet(doc, text, size=10):
    p = doc.add_paragraph(style="List Bullet")
    set_para(p, before=0, after=1, line=1.2)
    # clear default and rewrite
    p.clear()
    run = p.add_run(text)
    set_run_font(run, size=size)
    return p


def add_muted(doc, text, size=9.5):
    return add_line(doc, text, size=size, before=0, after=1, color=RGBColor(0x55, 0x55, 0x55))


def setup_doc(margins=(1.4, 1.5, 1.4, 1.5)):
    doc = Document()
    for section in doc.sections:
        section.top_margin = Cm(margins[0])
        section.bottom_margin = Cm(margins[1])
        section.left_margin = Cm(margins[2])
        section.right_margin = Cm(margins[3])
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
    return doc


# ---------- Chinese 1-page ----------
def build_zh_1():
    doc = setup_doc((1.2, 1.2, 1.4, 1.4))
    add_center(doc, "侯钟棋", size=20, bold=True, after=4)
    add_center(doc, "求职意向：海外技术支持工程师（半导体设备 / 机器人）｜深圳｜可接受海外出差", size=10.5, bold=True)
    add_center(doc, "23岁｜男｜本科｜英语可流利对接海外客户｜持有英国签证（约2年有效）", size=10)
    add_center(doc, "178-1676-9251｜zhongqi_hou@foxmail.com", size=10, after=4)

    add_heading_bar(doc, "核心优势")
    for t in [
        "做过欧洲现场和远程售后，去过西班牙、荷兰、法国、德国做问题处理和产品培训，英语沟通比较顺畅，客户基本能听懂。",
        "常在客户和研发中间传话对接。有一个大客户的四轮定位软硬件需求，跟了大概4个月，需求和方案对清楚后产品顺利交出去了。",
        "自己用 Cursor 搭过服务部门的知识库助手，跑在公司服务器上，销售和服务同事都能问。另外还做了售后工单记录和问题看板。",
        "自动化专业，大学在智能车实验室待了三年，会看 PCB、写一点嵌入式 C，也做过焊接和万用表调试。新产品上手不算慢。",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "工作经历")
    add_job_head(doc, "易检智能（SmartSafe）｜海外技术支持 / 服务工程师", "2025.11 – 至今")
    add_muted(doc, "汽车后市场检测与维保设备。对内是服务工程师，对外做海外技术支持，售前培训和售后都做。")
    for t in [
        "负责过的产品包括四轮定位、ADAS 校准、冷媒交换机、喷油嘴检测清洗、变速箱油液交换、新能源电池包充放电和均衡维保、诊断平板等。产品线比较多，公司培训不够细，主要靠自己查资料和跟现场案子学，后面可以独立跟客户。",
        "出差去过西班牙、荷兰、法国、德国，现场处理售后问题，也给经销商和终端客户做产品培训、演示和答疑。",
        "跟过大客户四轮定位设备的软硬件需求，前后大约4个月。客户提的改动我会整理清楚再给研发，研发进度和限制也会跟客户说明，最后产品完成落地。",
        "用 Cursor 做了服务部门的问答知识库，把常见问题、处理办法和产品文件放进去。同事提问就能找到对应材料。账号开给了销售和服务，程序挂在公司服务器上全天跑，减少时差导致找资料不方便的情况。",
        "做了售后工单记录平台，可以上传视频、图片和文档，每个 case 对应客户和问题。另外有个简单看板，能看各客户问题累计情况。",
    ]:
        add_bullet(doc, t, size=9.5)

    add_job_head(doc, "ELEGOO（深圳市智能派科技有限公司）｜海外技术支持工程师", "2025.08 – 2025.10")
    add_muted(doc, "3D 打印出海。主要在工位远程回复欧美客户的技术问题。")
    for t in [
        "尽快熟悉产品后，自己处理欧美客户咨询。把常见问题和处理方法整理成个人知识库，并训练了 AI Agent，回复会快一些。",
        "一线遇到的高频问题和可疑设计问题，会整理后反馈给产品和研发。",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "教育背景")
    add_job_head(doc, "浙江科技大学｜自动化｜本科｜GPA 3.04（专业前15%）", "2021.09 – 2025.06")
    for t in [
        "智能车实验室三年。做过英飞凌 TC264/TC377 惯导定位越野车，GPS 和 IMU 融合，调过 PID。第十八届全国大学生智能车竞赛浙江省二等奖（省第四）。",
        "接触过 STM32、传感器驱动、UART/SPI、FreeRTOS 基础，也会看 PCB、焊接、万用表和嵌入式 C。",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "技能特长")
    for t in [
        "语言：英语 CET-6，能独立和海外客户打电话、做现场培训，也能写英文邮件和简单技术说明。",
        "支持：多产品售后排查、售前培训、把客户需求讲给研发听，也把研发方案讲回给客户和销售。",
        "技术：自动化和嵌入式基础，Python/Matlab 做过一点数据分析，会用 Cursor 等工具整理资料和搭小工具。",
        "其他：期望工作地深圳。出差可以接受，大约一年三次，单次一个月左右。",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "奖项荣誉")
    for t in [
        "第十八届全国大学生智能车竞赛 浙江省二等奖（2023.07）",
        "浙江省大学生英语竞赛 校一等奖（2022.05）",
        "第六届普译奖全国大学生英语写作大赛 全国三等奖（2023.12）",
        "学业优秀奖学金、美仪企业奖学金（7/92）",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "自我评价")
    add_line(
        doc,
        "沟通还可以，学东西不算慢。比较适合先做海外技术支持，把设备和客户问题摸熟，后面再往海外销售方向转。",
        size=9.5,
        after=2,
    )
    return doc


# ---------- Chinese 2-page ----------
def build_zh_2():
    doc = setup_doc((1.4, 1.4, 1.5, 1.5))
    add_center(doc, "侯钟棋", size=20, bold=True, after=4)
    add_center(doc, "求职意向：海外技术支持工程师（半导体设备 / 机器人）｜深圳", size=10.5, bold=True)
    add_center(doc, "23岁｜男｜自动化本科｜英语可流利对接海外客户｜持有英国签证（约2年有效）", size=10)
    add_center(doc, "电话：178-1676-9251｜邮箱：zhongqi_hou@foxmail.com｜出差：约一年三次，单次约一个月", size=10, after=4)

    add_heading_bar(doc, "个人简介")
    for t in [
        "想先做海外技术支持，把设备和客户支持做扎实，再往海外销售或售前方向发展。",
        "现在比较熟的是远程和欧洲现场支持。客户现场的问题，我会尽量整理成研发能动手改的描述。研发给出方案后，也会再用客户听得懂的方式讲回去。",
        "平时会用 Cursor 把常见问题和资料做成部门能用的知识库，也做过工单记录，方便跨时差查资料和翻旧案子。",
        "自动化背景，大学在智能车实验室做过传感器、嵌入式和板级调试，后面跟机电类、检测类、机器人相关设备会相对好上手。",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "工作经历")
    add_job_head(doc, "易检智能（SmartSafe）｜海外技术支持 / 服务工程师", "2025.11 – 至今")
    add_muted(doc, "汽车后市场检测与维保设备。对内服务工程师，对外海外技术支持，售前培训加售后支持。")
    for t in [
        "产品覆盖四轮定位、ADAS 校准、汽车空调冷媒交换机、喷油嘴检测清洗机、变速箱油液清洗交换机、新能源电池包充放电与均衡维保设备、汽车诊断平板等。产品线偏多，培训有时不够深入，很多内容靠自己查文档和跟案子学，后面能独立接客户。",
        "出差西班牙、荷兰、法国、德国，做过售后故障处理和现场产品培训，直接面对经销商和终端客户。",
        "有一个大客户的四轮定位软硬件需求，我跟了大概4个月。功能、接口、验收和问题优先级，经常在客户和研发两边来回对齐，最后产品落地交付。",
        "因为负责的线比较多，我不太会把自己定位成某一台设备的专家，更多是把问题问清楚、分清楚该找谁、推进进度，并管理好客户预期。",
        "用 Cursor 搭了服务部门知识库助手，常见问题、处理办法和产品文件都放进去，同事用对话方式提问就能找到材料。给销售和服务开了账号，部署在公司服务器上全天运行，缓解国内外时差导致销售要资料、国内却已下班的情况。",
        "开发了售后工单记录平台，支持上传视频、图片、文档，每个 case 对应客户和问题。还有数据看板，能看到各客户问题累计数。",
    ]:
        add_bullet(doc, t)

    add_job_head(doc, "ELEGOO（深圳市智能派科技有限公司）｜海外技术支持工程师", "2025.08 – 2025.10")
    add_muted(doc, "3D 打印出海。工位远程处理欧美客户售后和技术邮件。")
    for t in [
        "尽快熟悉产品线后独立处理欧美客户咨询。把重复问题整理进个人知识库，并训练 AI Agent，提高检索和回复速度。",
        "把用户痛点、可疑设计问题和改进建议整理给产品和研发。",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "教育背景")
    add_job_head(doc, "浙江科技大学｜自动化｜本科｜GPA 3.04（专业前15%）", "2021.09 – 2025.06")
    add_muted(doc, "CET-6。主修单片机与嵌入式、微机原理、自动控制原理、C 语言、数据结构等。智能车实验室三年。")

    add_heading_bar(doc, "项目经历")
    add_job_head(doc, "惯导定位越野车（英飞凌 TC264 / TC377）", "2022.12 – 2023.08")
    add_muted(doc, "智能车实验室。GPS + IMU。浙江省大学生智能车竞赛二等奖（省第四）。")
    for t in [
        "对比过 GPS_TAU1201（UART）和 IMU660RA（SPI），后来用融合和互补算法提高实时性，循迹响应更快，比赛用时大约少了2秒。",
        "做过自动任务分区，减少手动干预。用 VOFA+ 和 Matlab 看路径误差，调 PID，寻迹偏得少一些。",
        "备赛时也参与传感器选型和软硬件分工讨论。",
    ]:
        add_bullet(doc, t)

    add_job_head(doc, "自动红外循迹系统（德州仪器 MSPM0G3507）", "2024.07 – 2024.08")
    add_muted(doc, "MPU6050 + 红外阵列。浙江省大学生电子设计竞赛 H 题，完成前三问。")
    for t in [
        "提过 7 路红外 3-1-3 布局，团队后来按这个做。用 DMP 取欧拉角，并做误差修正，缓解偏航角零漂。",
        "在 Keil5 / SysConfig 里配 GPIO 和 UART，外设联调会快一点。",
    ]:
        add_bullet(doc, t)

    add_job_head(doc, "基于 μC/OS-II 车载电控单元（STM32F103C8T6）", "2025.02 – 2025.04")
    add_muted(doc, "实时控制。障碍物识别响应延迟小于 50ms。")
    for t in [
        "对比 FreeRTOS 和 μC/OS-II 后选了 μC/OS-II 并移植。主要负责超声波测距、电机减速、蜂鸣报警和霍尔转速显示。",
        "用嘉立创 EDA 改过 PCB，缩短硬件验证时间。",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "技能特长")
    for t in [
        "语言：英语 CET-6，能独立完成海外客户沟通、现场培训讲解和英文技术邮件。",
        "客户支持：售前培训、售后排查、现场交付、需求转述、跨时区沟通。",
        "工程基础：STM32 / 英飞凌 / TI 单片机，UART/SPI，FreeRTOS / μC/OS-II 基础，PCB 识图、焊接、万用表，Python、Matlab。",
        "工具：Cursor，知识库整理，工单和简单看板，ProcessOn / Visio / Xmind / Office。",
        "其他：持有英国签证（约2年有效）。期望工作地深圳。可接受海外出差，大约一年三次，单次约一个月。",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "奖项荣誉")
    for t in [
        "第十八届全国大学生智能车竞赛 浙江省二等奖（2023.07）",
        "2024 年浙江省大学生电子设计竞赛 H 题，完成前三问（2024.08）",
        "浙江省大学生英语竞赛 校一等奖（2022.05）",
        "第六届普译奖全国大学生英语写作大赛 全国三等奖（2023.12）",
        "学业优秀一等奖学金、美仪企业奖学金（7/92，2022–2024）",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "自我评价")
    for t in [
        "沟通是目前比较明显的长处，能在客户、销售、研发之间把事实和下一步动作对齐。",
        "学东西愿意自己查，也会把重复问题沉淀成文档或小工具。编程能力还在补，目前更适合以设备理解和客户交付为主的海外技术支持或售前岗位。",
        "希望加入半导体设备或机器人公司，长期在深圳发展，后面再往海外销售转。",
    ]:
        add_bullet(doc, t)
    return doc


# ---------- English 1-page ----------
def build_en_1():
    doc = setup_doc((1.2, 1.2, 1.4, 1.4))
    add_center(doc, "Zhongqi Hou", size=20, bold=True, after=4)
    add_center(
        doc,
        "Target role: Overseas Technical Support Engineer (Semiconductor Equipment / Robotics) | Shenzhen | Open to overseas travel",
        size=10,
        bold=True,
    )
    add_center(doc, "English-fluent with overseas customers | UK visa (~2 years) | +86 178-1676-9251 | zhongqi_hou@foxmail.com", size=9.5, after=4)

    add_heading_bar(doc, "Summary")
    for t in [
        "Handled both remote and on-site support in Europe, including Spain, the Netherlands, France, and Germany. Comfortable training customers and troubleshooting in English.",
        "Often work between customers and R&D. Followed a key-account wheel-alignment hardware and software request for about four months until the product was delivered.",
        "Built a service knowledge-base assistant with Cursor on company servers, and also made a simple after-sales ticket board with media upload.",
        "Automation background with three years in a smart-car lab. Can read PCBs, write basic embedded C, and do soldering and multimeter checks. Pick up new product lines fairly quickly.",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "Experience")
    add_job_head(doc, "SmartSafe — Overseas Technical Support / Service Engineer", "Nov 2025 – Present")
    add_muted(doc, "Automotive aftermarket test and maintenance equipment. Pre-sales training, after-sales support, and customer–R&D coordination.")
    for t in [
        "Covered wheel alignment, ADAS calibration, A/C refrigerant exchange, injector cleaning, ATF exchange, EV battery pack charge/discharge and balancing, and diagnostic tablets. Product training was limited, so I learned mostly from documents and real cases, then supported customers on my own.",
        "Traveled to Spain, the Netherlands, France, and Germany for on-site fault handling and product training with dealers and end users.",
        "Spent about four months on a key-account wheel-alignment HW/SW request. Clarified changes for R&D, explained limits and progress back to the customer, and helped get the product delivered.",
        "Built a Q&A knowledge base with Cursor for common fixes and product files. Opened accounts for sales and service, and kept it running on company servers around the clock so people could find materials across time zones. Also built a ticket tool with video, image, and document upload, plus a simple issue dashboard.",
    ]:
        add_bullet(doc, t, size=9.5)

    add_job_head(doc, "ELEGOO — Overseas Technical Support Engineer", "Aug 2025 – Oct 2025")
    add_muted(doc, "3D printing export. Remote technical support for EU and US customers.")
    for t in [
        "Learned the product line quickly and handled EU/US inquiries myself. Kept a personal knowledge base and used an AI agent to answer repeat questions faster. Sent recurring issues and design concerns back to product and engineering.",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "Education")
    add_job_head(doc, "Zhejiang University of Science and Technology — B.E. Automation | GPA 3.04 (Top 15%)", "Sep 2021 – Jun 2025")
    for t in [
        "Three years in the Intelligent Vehicle Lab. Infineon TC264/TC377 GPS+IMU off-road vehicle with PID tuning. Provincial 2nd Prize in the National Intelligent Vehicle Competition (4th in Zhejiang).",
        "Basics in STM32, sensor drivers, UART/SPI, FreeRTOS, PCB reading, soldering, multimeter work, and embedded C.",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "Skills and Awards")
    for t in [
        "Languages: CET-6 English. Can handle overseas calls, on-site training, and technical email.",
        "Support: multi-product diagnosis, pre-sales training, translating customer needs for R&D, and explaining solutions back to customers and sales.",
        "Technical: automation and embedded basics, some Python/Matlab, Cursor for docs and small internal tools. Prefer Shenzhen. Travel about three times a year, about one month each.",
        "Awards: Provincial 2nd Prize, National Intelligent Vehicle Competition (2023). Campus 1st Prize, Zhejiang College English Contest (2022). National 3rd Prize, Puyi English Writing Contest (2023). Scholarships (rank 7/92).",
    ]:
        add_bullet(doc, t, size=9.5)

    add_heading_bar(doc, "Profile")
    add_line(
        doc,
        "I communicate clearly and learn quickly. I want to stay in overseas technical support first, get solid with equipment and customers, then move toward overseas sales later.",
        size=9.5,
    )
    return doc


# ---------- English 2-page ----------
def build_en_2():
    doc = setup_doc((1.4, 1.4, 1.5, 1.5))
    add_center(doc, "Zhongqi Hou", size=20, bold=True, after=4)
    add_center(doc, "Target role: Overseas Technical Support Engineer (Semiconductor Equipment / Robotics) | Shenzhen", size=10.5, bold=True)
    add_center(doc, "English-fluent with overseas customers | UK visa holder (~2 years)", size=10)
    add_center(doc, "+86 178-1676-9251 | zhongqi_hou@foxmail.com | Travel: about 3 trips/year, about 1 month each", size=10, after=4)

    add_heading_bar(doc, "Professional Summary")
    for t in [
        "Plan to build depth in overseas technical support first, then move toward overseas sales or pre-sales later.",
        "Comfortable with remote support and Europe on-site work. I try to turn field issues into clear notes for R&D, then explain the fix back in customer language.",
        "I use Cursor to keep common problems and files in a shared knowledge base, and I built a ticket log so cases are easier to revisit across time zones.",
        "Automation degree and smart-car lab work gave me a base in sensors, embedded systems, PCB reading, and hands-on debugging.",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "Work Experience")
    add_job_head(doc, "SmartSafe — Overseas Technical Support / Service Engineer", "Nov 2025 – Present")
    add_muted(doc, "Automotive aftermarket inspection and maintenance equipment. Internal service engineer and external overseas technical support.")
    for t in [
        "Supported wheel alignment, ADAS calibration, A/C refrigerant exchange, injector cleaning, transmission fluid exchange, EV battery pack charge/discharge and balancing, and diagnostic tablets. Deep training was limited, so I learned from docs and live cases until I could support customers independently.",
        "On-site work in Spain, the Netherlands, France, and Germany for after-sales faults and product training with dealers and end users.",
        "Followed a key-account wheel-alignment hardware and software request for about four months. Kept features, interfaces, acceptance points, and priorities aligned between the customer and R&D until delivery.",
        "With a wide portfolio, I am not positioning myself as a single-machine specialist. My stronger output is clarifying issues, routing them to the right people, pushing progress, and managing expectations.",
        "Built a service knowledge-base assistant with Cursor. Common issues, fix steps, and product files are searchable in a chat style. Accounts went to sales and service. It runs on company servers day and night, which helps when overseas sales need files after China office hours.",
        "Built an after-sales ticket platform with video, image, and document upload. Each case links to the customer and the issue. A dashboard shows cumulative issue counts.",
    ]:
        add_bullet(doc, t)

    add_job_head(doc, "ELEGOO — Overseas Technical Support Engineer", "Aug 2025 – Oct 2025")
    add_muted(doc, "3D printing export. Desk-based remote support for EU and US customers.")
    for t in [
        "Learned the product line quickly and handled EU/US technical inquiries myself. Built a personal knowledge base and used an AI agent for repeat questions.",
        "Collected user pain points and possible design issues for product and engineering.",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "Education")
    add_job_head(doc, "Zhejiang University of Science and Technology — B.E. Automation | GPA 3.04 (Top 15%)", "Sep 2021 – Jun 2025")
    add_muted(doc, "CET-6. Coursework in MCU/embedded design, microcomputer principles, automatic control, C, and data structures. Intelligent Vehicle Lab for three years.")

    add_heading_bar(doc, "Projects")
    add_job_head(doc, "Inertial Navigation Off-Road Vehicle (Infineon TC264 / TC377)", "Dec 2022 – Aug 2023")
    add_muted(doc, "GPS + IMU. Provincial 2nd Prize (4th in Zhejiang), National Intelligent Vehicle Competition.")
    for t in [
        "Compared GPS over UART and IMU over SPI, then used fusion and complementary filtering to improve response. Race time dropped by about two seconds.",
        "Added automatic task-zone logic, used VOFA+ and Matlab to check path error, and tuned PID. Also joined sensor selection and HW/SW planning during prep.",
    ]:
        add_bullet(doc, t)

    add_job_head(doc, "Infrared Line-Following (TI MSPM0G3507) and Vehicle ECU on μC/OS-II (STM32F103)", "2024.07 – 2025.04")
    for t in [
        "IR array plus MPU6050 with DMP Euler angles and yaw-drift correction. Zhejiang Electronic Design Contest Problem H, first three tasks completed.",
        "Ported μC/OS-II after comparing it with FreeRTOS. Owned ultrasonic ranging, motor slowdown, buzzer alert, and Hall RPM display. Obstacle response under 50 ms. Iterated PCB in JLCPCB EDA.",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "Skills")
    for t in [
        "Languages: CET-6 English for overseas calls, on-site training, and technical email.",
        "Support: pre-sales training, after-sales diagnosis, field delivery, requirement notes, and cross-timezone communication.",
        "Engineering: STM32 / Infineon / TI, UART/SPI, RTOS basics, PCB reading, soldering, multimeter, Python, Matlab.",
        "Tools: Cursor, knowledge-base setup, ticket and dashboard workflows, ProcessOn / Visio / Xmind / Office.",
        "Other: UK visa (~2 years). Prefer Shenzhen. Overseas travel about three times a year, about one month each.",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "Honors")
    for t in [
        "Provincial 2nd Prize, 18th National College Student Intelligent Vehicle Competition (Jul 2023)",
        "Campus 1st Prize, Zhejiang College English Contest (May 2022)",
        "National 3rd Prize, 6th Puyi National College English Writing Contest (Dec 2023)",
        "Academic Excellence and Meiyi Corporate Scholarship (rank 7/92, 2022–2024)",
    ]:
        add_bullet(doc, t)

    add_heading_bar(doc, "Self Assessment")
    add_line(
        doc,
        "Communication is my stronger side. I learn by doing and by writing things down. Coding is still something I am improving. Best fit for now is overseas technical support or pre-sales in semiconductor equipment or robotics, based in Shenzhen, with a later path into overseas sales.",
        size=10,
    )
    return doc


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "侯钟棋-海外技术支持-中文-一页版.docx": build_zh_1(),
        "侯钟棋-海外技术支持-中文-两页版.docx": build_zh_2(),
        "Hou-Zhongqi-Overseas-Technical-Support-EN-1page.docx": build_en_1(),
        "Hou-Zhongqi-Overseas-Technical-Support-EN-2page.docx": build_en_2(),
    }
    for name, doc in files.items():
        path = OUT / name
        doc.save(path)
        print("Wrote", path)


if __name__ == "__main__":
    main()
