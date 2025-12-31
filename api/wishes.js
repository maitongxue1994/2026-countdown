export default async function handler(req, res) {
  const CONFIG = {
    appId: 'Mx6b42Q9ACDzsoOnNmNBDhJh-MdYXbMMI',
    masterKey: 'n5qwBE8PT8YsVQQnKGXGGjZu',
    serverURL: 'https://mx6b42q9.api.lncldglobal.com'
  };

  const headers = {
    "X-LC-Id": CONFIG.appId,
    "X-LC-Key": `${CONFIG.masterKey},master`,
    "Content-Type": "application/json"
  };

  try {
    // --- 功能 1: 获取愿望列表 (GET) ---
    if (req.method === 'GET') {
      const queryUrl = `${CONFIG.serverURL}/1.1/classes/Wishes?limit=50&order=-likes,-createdAt`;
      const response = await fetch(queryUrl, { headers });
      const data = await response.json();
      
      // 格式化数据返回给前端
      const safeData = (data.results || []).map(item => ({
        id: item.objectId,
        text: item.text,
        likes: item.likes || 0
      }));
      
      return res.status(200).json(safeData);
    }

    // --- 功能 2: 发布新愿望 (POST) ---
    if (req.method === 'POST') {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "内容不能为空" });

      const body = {
        text: text,
        likes: 0,
        ACL: { "*": { "read": true, "write": true } }
      };

      await fetch(`${CONFIG.serverURL}/1.1/classes/Wishes`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      return res.status(200).json({ success: true });
    }

    // --- 功能 3: 点赞 (PUT) ---
    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "ID不能为空" });

      // 使用原子操作增加点赞数
      const body = {
        likes: { "__op": "Increment", "amount": 1 }
      };

      await fetch(`${CONFIG.serverURL}/1.1/classes/Wishes/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
