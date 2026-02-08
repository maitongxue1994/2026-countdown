export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

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
    // --- GET: Fetch wish list ---
    if (req.method === 'GET') {
      const queryUrl = `${CONFIG.serverURL}/1.1/classes/Wishes?limit=50&order=-likes,-createdAt`;
      const response = await fetch(queryUrl, { headers });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('LeanCloud GET error:', response.status, errText);
        return res.status(502).json({ error: '获取愿望列表失败' });
      }

      const data = await response.json();
      const safeData = (data.results || []).map(item => ({
        id: item.objectId,
        text: item.text,
        likes: typeof item.likes === 'number' ? item.likes : 0
      }));

      return res.status(200).json(safeData);
    }

    // --- POST: Create new wish ---
    if (req.method === 'POST') {
      const { text } = req.body || {};

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: '愿望内容不能为空' });
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) {
        return res.status(400).json({ error: '愿望内容不能为空' });
      }
      if (trimmed.length > 200) {
        return res.status(400).json({ error: '愿望内容不能超过200个字符' });
      }

      // Basic sanitization: strip HTML tags to prevent stored XSS
      const sanitized = trimmed.replace(/<[^>]*>/g, '');

      const body = {
        text: sanitized,
        likes: 0,
        ACL: { "*": { "read": true, "write": true } }
      };

      const response = await fetch(`${CONFIG.serverURL}/1.1/classes/Wishes`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('LeanCloud POST error:', response.status, errText);
        return res.status(502).json({ error: '发布愿望失败，请稍后重试' });
      }

      const result = await response.json();
      return res.status(201).json({
        success: true,
        id: result.objectId
      });
    }

    // --- PUT: Like a wish ---
    if (req.method === 'PUT') {
      const { id } = req.body || {};

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'ID不能为空' });
      }

      // Validate ID format (LeanCloud objectId is alphanumeric)
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return res.status(400).json({ error: '无效的ID格式' });
      }

      const body = {
        likes: { "__op": "Increment", "amount": 1 }
      };

      const response = await fetch(`${CONFIG.serverURL}/1.1/classes/Wishes/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('LeanCloud PUT error:', response.status, errText);
        if (response.status === 404) {
          return res.status(404).json({ error: '愿望不存在' });
        }
        return res.status(502).json({ error: '点赞失败，请稍后重试' });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API handler error:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
