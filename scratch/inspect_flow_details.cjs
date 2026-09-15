const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function inspectFlow() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  // Let's trace from AGENTE DE I.A. to the end
  function findNode(name) {
    return wf.nodes.find(n => n.name === name);
  }

  console.log('--- 1. AGENTE DE I.A. ---');
  const agent = findNode('AGENTE DE I.A.');
  console.log('Agent params:', JSON.stringify(agent?.parameters, null, 2));
  console.log('Agent outputs to:', wf.connections['AGENTE DE I.A.']);

  console.log('\n--- 2. Delay Humano ---');
  const delayHumano = findNode('Delay Humano');
  console.log('Delay Humano params:', JSON.stringify(delayHumano?.parameters, null, 2));
  console.log('Delay Humano outputs to:', wf.connections['Delay Humano']);

  console.log('\n--- 3. SEPARA MENSAGENS2 ---');
  const separa = findNode('SEPARA MENSAGENS2');
  console.log('SEPARA MENSAGENS2 type & params:', separa?.type, JSON.stringify(separa?.parameters, null, 2));
  console.log('SEPARA MENSAGENS2 outputs to:', wf.connections['SEPARA MENSAGENS2']);

  console.log('\n--- 4. Divide Mensagens ---');
  const divide = findNode('Divide Mensagens');
  console.log('Divide Mensagens type & params:', divide?.type, JSON.stringify(divide?.parameters, null, 2));
  console.log('Divide Mensagens outputs to:', wf.connections['Divide Mensagens']);

  console.log('\n--- 5. All nodes after Divide Mensagens ---');
  // Follow connections
  let current = 'Divide Mensagens';
  let visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    const conns = wf.connections[current];
    if (!conns) break;
    console.log(`\nConnection from [${current}]:`, JSON.stringify(conns, null, 2));
    const nextNodeName = conns.main?.[0]?.[0]?.node;
    if (nextNodeName) {
      const nextNode = findNode(nextNodeName);
      console.log(`Node [${nextNodeName}] (${nextNode?.type}):`, JSON.stringify(nextNode?.parameters, null, 2));
      current = nextNodeName;
    } else {
      break;
    }
  }
}

inspectFlow().catch(console.error);
