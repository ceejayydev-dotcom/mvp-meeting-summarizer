const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const transcript = (body.transcript || '').slice(0, 40000); // safety limit
    if(!transcript) return { statusCode: 400, body: JSON.stringify({ error: 'No transcript' }) };

    const HF_TOKEN = process.env.HF_TOKEN;
    if(!HF_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'Server missing HF_TOKEN' }) };

    const model = 'google/flan-t5-small'; // small model for low cost / faster inference
    const payload = {
      inputs: `Summarize the meeting transcript below into a 6 line summary and a bullet list of action items:\n\n${transcript}`,
      parameters: { max_new_tokens: 150 }
    };

    const r = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: 60000
    });

    const data = await r.json();
    // If HF returns an array with generated_text
    let summary = '';
    if(Array.isArray(data) && data[0] && data[0].generated_text) summary = data[0].generated_text;
    else if(data.generated_text) summary = data.generated_text;
    else summary = JSON.stringify(data).slice(0, 1000);

    return { statusCode: 200, body: JSON.stringify({ summary }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
