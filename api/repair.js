export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    // 1. Fetch all wishes
    const queryUrl = `${CONFIG.serverURL}/1.1/classes/Wishes?limit=1000`;
    const fetchRes = await fetch(queryUrl, { method: "GET", headers });

    if (!fetchRes.ok) {
      const errText = await fetchRes.text().catch(() => '');
      console.error('LeanCloud query error:', fetchRes.status, errText);
      return res.status(502).json({ error: `查询失败: ${fetchRes.status}` });
    }

    const data = await fetchRes.json();
    const results = data.results || [];

    if (results.length === 0) {
      return res.status(200).json({
        message: '没有需要修复的数据',
        total: 0, success: 0, failed: 0
      });
    }

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // 2. Repair each record
    for (const item of results) {
      const updateData = {
        "ACL": { "*": { "read": true, "write": true } }
      };

      // Fix missing likes field
      if (item.likes === undefined || item.likes === null || typeof item.likes !== 'number') {
        updateData.likes = 0;
      }

      // Sanitize text field if it contains HTML
      if (item.text && typeof item.text === 'string' && /<[^>]*>/.test(item.text)) {
        updateData.text = item.text.replace(/<[^>]*>/g, '');
      }

      const updateUrl = `${CONFIG.serverURL}/1.1/classes/Wishes/${item.objectId}`;
      try {
        const updateRes = await fetch(updateUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify(updateData)
        });

        if (updateRes.ok) {
          successCount++;
        } else {
          failCount++;
          const errText = await updateRes.text().catch(() => '');
          errors.push({ id: item.objectId, status: updateRes.status, error: errText });
        }
      } catch (err) {
        failCount++;
        errors.push({ id: item.objectId, error: err.message });
      }
    }

    // 3. Return structured result
    return res.status(200).json({
      message: '修复完成',
      total: results.length,
      success: successCount,
      failed: failCount,
      ...(errors.length > 0 && { errors: errors.slice(0, 10) })
    });

  } catch (error) {
    console.error('Repair handler error:', error);
    return res.status(500).json({ error: `服务器错误: ${error.message}` });
  }
}
