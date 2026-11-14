# 通知配置模板 — 复制为 docs/notify.yaml 后按需修改
# webhook/密钥属敏感信息：此文件不要提交到 git（或用环境变量替代）

project: "项目名"
owner: "项目负责人名字"

channels:
  feishu:                       # 飞书群机器人
    enabled: true
    webhook: "https://open.feishu.cn/open-apis/bot/v2/hook/<token>"
    # 也可用环境变量 NOTIFY_FEISHU_WEBHOOK，配置里留空即可
  dingtalk:                     # 钉钉群机器人
    enabled: false
    webhook: ""
  wecom:                        # 企业微信群机器人
    enabled: false
    webhook: ""
  connector:                    # WorkBuddy 飞书/企微连接器（会话内已启用时优先）
    enabled: false
    target: "群名或联系人"

# 订阅事件（对应 sd-notifier 事件清单；false = 静默）
events:
  stage_completed: true         # 每个阶段完成
  gate_overlimit: true          # 质检门自检超限
  test_rejected: false          # 测试打回（频繁，默认关）
  test_recovered: true          # 打回后修复通过
  final_ready: true             # 终验就绪，等验收
  fixloop_round: true           # 修复循环每轮
  pipeline_stopped: true        # 流水线停止（超限）
  change_applied: true          # 需求变更生效

quiet_hours: ""                 # 可选：免打扰时段，如 "23:00-07:00"，通知延迟到时段结束
