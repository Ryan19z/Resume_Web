/** 使用说明弹窗内展示的纯文本（避免运行时读取 md 文件） */
export const HELP_GUIDE_TEXT = `
一、页面结构
本页从上到下分为三块：首屏（姓名与求职信息）、履历（工作与教育）、作品集（封面与外链）。
顶部导航可点击「首屏 / 履历 / 作品」快速跳转。

二、主题
左下角「主题」可切换整站配色，仅影响观感。

三、如何编辑（有编辑权限时）
1）首屏就地改字：首屏与预览版式一致，直接点击姓名、意向岗位、一句话介绍或三条要点即可编辑（无额外边框）；修改会在短暂停顿后自动保存。
2）形象照与更多字段：右下角「站点编辑」→「首屏与形象」，可上传小图（约 600KB 内）或粘贴图片 HTTPS 链接，并填写页脚邮箱等。
3）履历用词：「站点编辑」→「履历页用词」。
4）作品页用词与添加作品：「站点编辑」→「作品页用词」；作品卡片用「+ 插入作品」添加，需填写图片与作品页的网址（URL）。
5）单条工作经历：履历卡片右侧「编辑」；分区标题右侧「+ 添加工作经历」可新增一条并从编辑器填写。
6）预览：右上角「预览」可隐藏编辑按钮，模拟 HR 看到的页面；再点一次退出预览。

四、新手引导
首次进入时会在页面加载后尽快自动弹出步骤提示；也可在本说明底部点「重新播放新手引导」再次查看。

五、数据说明
内容保存在当前浏览器的本地存储中。换设备或清除站点数据后需重新填写。

六、分享给朋友（外网访问）
在本机开发时，朋友无法直接打开你电脑上的 localhost。请在项目根目录执行 npm run dev:share：脚本会先启动 Next 再打开 localtunnel，把终端里出现的 https 链接发给对方即可（该终端窗口需保持打开）。
若 loca.lt 访问不稳定，可在本机安装 cloudflared 后使用 npm run share:cf（需先 npm run dev 再执行）。该命令已默认使用 HTTP/2（TCP）连接边缘，避免部分网络屏蔽 QUIC（UDP）时出现 Error 1033「隧道无可用连接器」。若你确认网络允许 UDP，可改用 npm run share:cf:quic 尝试更快模式。

常见错误：若浏览器出现「530 / The origin has been unregistered from Argo Tunnel」：说明本机的 cloudflared 隧道已断开或云端已回收该临时域名，不是网页代码坏了。请在本机重新执行 npm run share:cf，复制终端里**新打印**的 trycloudflare 地址再访问；旧链接无法恢复。请保持运行 cloudflared 的终端不要关，并尽量避免电脑长时间休眠断网。

若仍出现「Error 1033」：请先结束旧的 cloudflared 进程后重新执行 npm run share:cf；仍不行可换 npm run dev:share（localtunnel），或检查本机/公司防火墙是否拦截出站 HTTPS 与 Cloudflare 相关端口。

若隧道能打开但页面像「只有纯文字、没有边距与主题」：多为 /_next/static 下 CSS、JS 未加载（例如开发模式误开 allowedDevOrigins 被 403）。请确认未设置已废弃的 NEXT_STRICT_DEV_ORIGINS；然后停掉 dev 后执行 npm run dev:fresh，再重新 npm run dev 与 npm run share:cf。

七、自定义 .com 域名（手机浏览器直接打开）
临时隧道链接通常不是 .com，且依赖你电脑一直开机。想要「yourname.com」这类地址并在手机 Safari/Chrome 里长期稳定打开，需要两步：

1）购买域名：在阿里云万网、腾讯云 DNSPod、Cloudflare Registrar、Namecheap 等注册一个 .com（或其它后缀），每年付费续费。

2）部署站点并绑定域名：把本项目部署到支持 HTTPS 与自定义域名的托管（Next.js 常用 Vercel：仓库推 GitHub → Vercel 导入项目 → 用 npm run build 通过构建 → 在 Vercel 控制台 Domains 里添加你的域名 → 按提示在域名注册商处添加 DNS（多为 CNAME 到 cname.vercel-dns.com 或 A 记录）。生效后，用 https://你的域名.com 即可在电脑与手机上访问。

说明：解析到 Vercel 等海外边缘网络的个人简历展示，一般可直接访问；若你将来把域名指向中国大陆机房的服务器，需遵守当地备案与内容规定。数据仍在访客浏览器本地存储中，换设备不会自动同步站点内容。
`.trim();
