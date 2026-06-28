<template>
  <div class="help-page">
    <div class="page-header">
      <el-icon><Notebook /></el-icon>
      <span>使用帮助</span>
    </div>

    <div class="help-content">
      <section class="help-section">
        <h2>📖 这是什么</h2>
        <p>固定队开荒时，每个人都会犯错——记不住谁犯了什么错、哪把最远到哪、今天效率如何？这个工具帮你<strong>记录每一把的犯错和进度</strong>，自动生成图表统计，让问题一目了然。</p>
        <p>数据全部保存在<strong>浏览器本地</strong>（localStorage），不上传任何服务器。换个浏览器或清缓存会丢，记得定期导出备份。</p>
      </section>

      <section class="help-section">
        <h2>🚀 快速开始</h2>
        <p>打开浏览器访问 <code>https://spqrwk.github.io/ff14-raid-tracker/</code> 即可使用。</p>
      </section>

      <section class="help-section">
        <h2>🏗️ 第一步：创建队伍</h2>
        <p>点击左侧 <strong>「队伍管理」</strong>，新建一个队伍：</p>
        <ul>
          <li>队伍名称：如「绝巴哈固定队」</li>
          <li>副本：从下拉列表选择，也支持自定义输入</li>
        </ul>
        <p>可以创建<strong>多个队伍</strong>（比如一个绝境战队、一个零式队），互不干扰。左上角随时切换当前使用的队伍。</p>
      </section>

      <section class="help-section">
        <h2>👥 第二步：添加队员</h2>
        <p>点击左侧 <strong>「成员管理」</strong>，你会看到一个 8 行表格：</p>
        <div class="demo-block">
          <pre>MT  ──── [________]    ST  ──── [________]
H1  ──── [________]    H2  ──── [________]
D1  ──── [________]    D2  ──── [________]
D3  ──── [________]    D4  ──── [________]</pre>
        </div>
        <ul>
          <li>在对应的位置填写队员的<strong>游戏角色名</strong></li>
          <li>空行跳过不保存</li>
          <li>同一位置可以点 <strong>+</strong> 加额外行（替补/多号玩家）</li>
          <li>填完点 <strong>「批量保存」</strong></li>
        </ul>
      </section>

      <section class="help-section">
        <h2>📝 第三步：开荒记录</h2>
        <p>回到 <strong>「开荒面板」</strong>，这里是日常使用的核心页面。</p>

        <h3>记录犯错</h3>
        <ul>
          <li><strong>勾选</strong>犯错的队员（可多选）—— 只显示上场队员，请假的不会出现</li>
          <li>选择 <strong>P几</strong>（阶段）</li>
          <li>填写犯错内容（选填）</li>
        </ul>
        <p class="level-demo">
          <strong>犯错等级</strong>：
          <span class="level-tag demo-death">减员</span> 仅减员，不影响继续 ·
          <span class="level-tag demo-wipe">团灭</span> 导致团灭，本把结束 ·
          <span class="level-tag demo-enrage">狂暴</span> 导致狂暴/输出不足 ·
          <span class="level-tag demo-unforgivable">罪无可恕</span> 极其低级的重大失误
        </p>
        <div class="help-tip">💡 <strong>团灭、狂暴、罪无可恕</strong> 会自动结束本把，下一把 Pull 号 +1。多人同时勾选也只算同一把。</div>

        <h3>记录进度</h3>
        <p>到达某个阶段但没有犯错？切到「记录进度」标签，填写到达的 P 几即可。</p>

        <h3>手动结束 / 通关</h3>
        <ul>
          <li><strong>手动结束</strong>：这把自己灭了但没记录到，点它结束本把</li>
          <li><strong>🏆 本把通关</strong>：过了！自动标记「已完成」并结束</li>
        </ul>
      </section>

      <section class="help-section">
        <h2>📊 第四步：查看统计</h2>
        <p>点击左侧 <strong>「数据统计」</strong>，4 个分析维度：</p>
        <ul>
          <li><strong>队员统计</strong>：每人每天犯错次数表格，含减员/团灭/狂暴/罪无可恕分项</li>
          <li><strong>开荒进度</strong>：折线图展示每把到达的阶段，直观看到趋势</li>
          <li><strong>犯错分布</strong>：饼图看等级分布、队员分布</li>
          <li><strong>队伍统计</strong>：按坦克/治疗/DPS 分组 + 角色位条形图对比</li>
        </ul>
      </section>

      <section class="help-section">
        <h2>📋 第五步：回顾历史</h2>
        <p><strong>「历史记录」</strong> 有两个视图：</p>
        <ul>
          <li><strong>按日期</strong>：传统视图，日期→把次两级分组</li>
          <li><strong>按把次</strong>：每行一把，可<strong>加精</strong> ⭐，点击展开看详情。加精标记值得复盘的关键 Pull</li>
        </ul>
      </section>

      <section class="help-section">
        <h2>🔄 队员上下场</h2>
        <p>有人请假？在 <strong>「成员管理」</strong> 中点「下场」，该队员将在犯错记录中隐藏，防止误选。归队后点「上场」恢复。</p>
      </section>

      <section class="help-section">
        <h2>💾 数据安全</h2>
        <p><strong>「数据管理」</strong> 页面提供：</p>
        <table class="help-table">
          <tr><td>导出全部</td><td>完整备份，JSON 文件下载</td></tr>
          <tr><td>导出队员</td><td>仅备份队员名单</td></tr>
          <tr><td>完整导入</td><td>从备份文件恢复全部数据</td></tr>
          <tr><td>仅导入队员</td><td>只导入队员名单，不影响记录</td></tr>
          <tr><td>阶段顺序</td><td>自定义每个副本的阶段（P1~P7 等）</td></tr>
          <tr><td>清空数据</td><td>输入确认文字 + 弹窗确认，双重保险</td></tr>
        </table>
        <div class="help-tip">⚠️ <strong>重要</strong>：定期导出备份！清除浏览器缓存会导致数据丢失。</div>
      </section>

      <section class="help-section">
        <h2>🔁 阶段顺序</h2>
        <p>不同副本阶段数量不同（绝境战 P1~P7，零式 P1~P4）。在「数据管理」→「阶段顺序配置」中，每个队伍独立配置。</p>
      </section>

      <section class="help-section">
        <h2>❓ 常见问题</h2>
        <div class="faq-item">
          <h4>Q：换电脑了数据怎么迁移？</h4>
          <p>旧电脑上「数据管理」→「导出全部」→ 把 JSON 文件传到新电脑 →「完整导入」。</p>
        </div>
        <div class="faq-item">
          <h4>Q：一个角色位有多个替补怎么加？</h4>
          <p>「成员管理」批量表格里，点角色行右侧的 <strong>+</strong> 新增一行。</p>
        </div>
        <div class="faq-item">
          <h4>Q：无犯通关怎么记录？</h4>
          <p>点开荒面板的「🏆 本把通关」按钮，自动标记完成并结束本把。</p>
        </div>
        <div class="faq-item">
          <h4>Q：多人同时犯错，选了团灭会变成好几把？</h4>
          <p>不会。多人勾选后提交，所有人在<strong>同一把</strong>里记录，团灭只结束一次。</p>
        </div>
        <div class="faq-item">
          <h4>Q：某天某人请假不来了怎么办？</h4>
          <p>「成员管理」中把该队员点「下场」，犯错记录里就不会出现了。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.help-page { max-width: 800px; margin: 0 auto; }

.help-content { display: flex; flex-direction: column; gap: 28px; }

.help-section h2 {
  font-size: 19px; color: #ffd700; margin-bottom: 12px;
  padding-bottom: 8px; border-bottom: 1px solid #2a2a4a;
}

.help-section h3 { font-size: 15px; color: #e0e0e0; margin: 14px 0 8px; }

.help-section h4 { font-size: 14px; color: #c0c0d0; margin-bottom: 4px; }

.help-section p { color: #a0a0b8; line-height: 1.8; margin-bottom: 8px; }

.help-section strong { color: #e0e0e0; }

.help-section code {
  background: #252540; padding: 2px 6px; border-radius: 3px;
  color: #ffd700; font-size: 13px;
}

.help-section ul { padding-left: 20px; margin-bottom: 8px; }

.help-section li { color: #a0a0b8; line-height: 2; font-size: 14px; }

.level-demo {
  display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap; line-height: 2.2;
}

.level-tag {
  display: inline-block; padding: 1px 8px; border-radius: 3px;
  color: #fff; font-size: 12px; font-weight: 700;
}

.demo-death  { background: #e6a23c; }
.demo-wipe   { background: #f56c6c; }
.demo-enrage { background: #c4568b; }
.demo-unforgivable { background: #9b0033; }

.demo-block {
  background: #141428; border: 1px solid #2a2a4a;
  border-radius: 6px; padding: 14px; margin: 10px 0;
}

.demo-block pre {
  color: #67c23a; font-family: 'Consolas', monospace;
  font-size: 13px; line-height: 1.8; margin: 0;
}

.help-tip {
  background: rgba(255,215,0,.05); border: 1px solid rgba(255,215,0,.15);
  border-radius: 6px; padding: 10px 14px; margin: 10px 0;
  color: #c0c0d0; font-size: 13px; line-height: 1.7;
}

.help-table { width: 100%; border-collapse: collapse; margin: 10px 0; }

.help-table td {
  padding: 8px 14px; border-bottom: 1px solid #2a2a4a;
  color: #a0a0b8; font-size: 14px;
}

.help-table td:first-child {
  color: #ffd700; font-weight: 600; white-space: nowrap; width: 120px;
}

.faq-item {
  background: #141428; border: 1px solid #2a2a4a;
  border-radius: 6px; padding: 12px 16px; margin-bottom: 10px;
}

.faq-item h4 { color: #e0e0e0; margin-bottom: 6px; }
.faq-item p { color: #808090; font-size: 13px; }

@media (max-width: 768px) {
  .help-page { padding: 0 4px; }
  .help-section h2 { font-size: 17px; }
  .help-table td:first-child { width: 90px; }
}
</style>
