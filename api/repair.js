export default async function handler(req, res) {
  // 配置信息
  const CONFIG = {
    appId: 'Mx6b42Q9ACDzsoOnNmNBDhJh-MdYXbMMI',
    masterKey: 'n5qwBE8PT8YsVQQnKGXGGjZu',
    serverURL: 'https://mx6b42q9.api.lncldglobal.com'
  };

  const headers = {
    "X-LC-Id": CONFIG.appId,
    "X-LC-Key": `${CONFIG.masterKey},master`, // 强制使用 MasterKey
    "Content-Type": "application/json"
  };

  try {
    // 1. 获取所有数据
    const queryUrl = `${CONFIG.serverURL}/1.1/classes/Wishes?limit=1000`;
    const fetchRes = await fetch(queryUrl, { method: "GET", headers });
    
    if (!fetchRes.ok) {
        return res.status(500).json({ error: `查询失败: ${fetchRes.status}` });
    }
    
    const data = await fetchRes.json();
    const results = data.results || [];
    
    let successCount = 0;
    let failCount = 0;

    // 2. 遍历修复
    for (const item of results) {
      const updateData = { 
        "ACL": { "*": { "read": true, "write": true } } // 强制所有人可读可写
      };
      
      // 补全缺失的点赞数
      if (item.likes === undefined || item.likes === null) {
        updateData.likes = 0;
      }

      const updateUrl = `${CONFIG.serverURL}/1.1/classes/Wishes/${item.objectId}`;
      const updateRes = await fetch(updateUrl, { 
        method: "PUT", 
        headers, 
        body: JSON.stringify(updateData) 
      });
      
      if (updateRes.ok) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // 3. 返回结果
    res.status(200).send(`修复完成！\n成功: ${successCount} 条\n失败: ${failCount} 条\n\n现在请去刷新你的倒计时主页查看效果！`);

  } catch (error) {
    res.status(500).send(`发生错误: ${error.message}`);
  }
}
