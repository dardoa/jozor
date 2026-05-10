/**
 * Standalone template for the Jozor Offline Viewer.
 * This HTML will be embedded inside the .jozor archive.
 */
export const OFFLINE_VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jozor Family Tree - Offline Viewer</title>
    <style>
        :root { --primary: #c39b5b; --bg: #f9f7f2; --card: #ffffff; --text: #1a1a1a; --border: #e5e0d5; }
        body { font-family: sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        header { padding: 1rem; background: var(--card); border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .container { flex: 1; display: flex; overflow: hidden; }
        #tree-container { flex: 1; position: relative; }
        #details-sidebar { width: 300px; background: var(--card); border-left: 1px solid var(--border); padding: 1rem; display: none; overflow-y: auto; }
        .node { cursor: pointer; }
        .node rect { fill: #fff; stroke: var(--primary); stroke-width: 2; }
    </style>
</head>
<body>
    <header><strong>JOZOR</strong> <span>Offline Archive</span></header>
    <div class="container">
        <div id="tree-container"></div>
        <div id="details-sidebar">
            <h2 id="side-name"></h2>
            <p id="side-bio"></p>
        </div>
    </div>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
        async function init() {
            try {
                const res = await fetch('family_data.json');
                const data = await res.json();
                const people = data.people || data;
                render(Object.values(people));
            } catch (e) { const tc = document.getElementById('tree-container'); if (tc) tc.innerText = 'Data not found.'; }
        }
        function render(nodes) {
            const svg = d3.select('#tree-container').append('svg').attr('width', '100%').attr('height', '100%');
            const g = svg.append('g');
            svg.call(d3.zoom().on('zoom', (e) => g.attr('transform', e.transform)));
            const sel = g.selectAll('.node').data(nodes).enter().append('g').attr('class', 'node')
                .attr('transform', (d, i) => 'translate(50,' + (50 + i * 60) + ')')
                .on('click', (e, d) => {
                    const sidebar = document.getElementById('details-sidebar');
                    const sideName = document.getElementById('side-name');
                    const sideBio = document.getElementById('side-bio');
                    if (sidebar) sidebar.style.display = 'block';
                    if (sideName) sideName.innerText = (d && d.firstName != null && d.lastName != null) ? (d.firstName + ' ' + d.lastName) : '';
                    if (sideBio) sideBio.innerText = (d && d.bio != null) ? d.bio : '';
                });
            sel.append('rect').attr('width', 200).attr('height', 40);
            sel.append('text').attr('x', 10).attr('y', 25).text(d => d.firstName + ' ' + d.lastName);
        }
        init();
    </script>
</body>
</html>`;
