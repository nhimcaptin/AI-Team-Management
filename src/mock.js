import fs from 'node:fs';
import path from 'node:path';

// Scripted answers so the UI and pipeline can be tried without spending quota.
// The critic objects in round 1, and the risk reviewer asks for changes once.
function script({ role, step, round, message }) {
  if (step === 'reply') {
    const question = /\?\s*$/.test(message || '');
    return {
      text: question
        ? `Đã xong, \`ai-team-mock.txt\` có đủ thời gian tạo và mô tả mục đích.\n\n\`\`\`json\n{"verdict": "ANSWER", "issues": []}\n\`\`\``
        : `Đây là yêu cầu sửa code, chuyển cho cả team làm.\n\n\`\`\`json\n{"verdict": "TASK", "issues": []}\n\`\`\``,
      activity: ['🔧 Read ai-team-mock.txt'],
    };
  }
  if (step === 'analyze') {
    return {
      text: `## Hiểu vấn đề
Yêu cầu cần thêm một file ghi chú nhỏ vào project${round > 1 ? ' (đã sửa theo phản biện)' : ''}.

## Hiện trạng
Đã đọc cấu trúc thư mục, chưa có file tương tự.

## Kế hoạch
1. Tạo \`ai-team-mock.txt\` ở thư mục gốc.
2. Ghi thời gian tạo vào file.${round > 1 ? '\n3. Thêm dòng mô tả mục đích file, như Claude góp ý.' : ''}

## Tiêu chí hoàn thành
- File tồn tại và có nội dung.`,
      activity: ['🔧 list_directory .', '🔧 read_file README.md'],
    };
  }
  if (step === 'critique') {
    const agree = round > 1;
    return {
      text: agree
        ? `Kế hoạch đã xử lý góp ý trước. Không còn vấn đề chặn.

\`\`\`json
{"verdict": "AGREE", "issues": [{"severity": "minor", "text": "Có thể thêm file vào .gitignore nếu chỉ dùng thử"}]}
\`\`\``
        : `Kế hoạch ổn nhưng thiếu mô tả mục đích của file, người đọc sau sẽ không hiểu file này để làm gì.

\`\`\`json
{"verdict": "OBJECT", "issues": [{"severity": "major", "text": "File không có mô tả mục đích"}]}
\`\`\``,
      activity: ['🔧 Glob **/*'],
    };
  }
  if (step === 'code') {
    return {
      text: `Đã tạo \`ai-team-mock.txt\` (lần ${round}).\n\n- Ghi thời gian tạo\n- Thêm mô tả mục đích${round > 1 ? '\n- Thêm dòng kết thúc theo review' : ''}`,
      activity: ['$ ls', '✏️ add ai-team-mock.txt'],
      write: true,
    };
  }
  if (step === 'review') {
    const approve = role === 'analyst' || round > 1;
    return {
      text: approve
        ? `Diff đúng với kế hoạch đã thống nhất.\n\n\`\`\`json\n{"verdict": "APPROVE", "issues": []}\n\`\`\``
        : `File thiếu dòng kết thúc (newline cuối file).\n\n\`\`\`json\n{"verdict": "CHANGES", "issues": [{"severity": "major", "text": "Thiếu newline cuối file"}]}\n\`\`\``,
      activity: ['🔧 Read ai-team-mock.txt'],
    };
  }
  return { text: 'OK', activity: [] };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function mockRun({ meta, cwd, onEvent }) {
  let killed = false;
  const promise = (async () => {
    const s = script(meta);
    for (const a of s.activity) {
      if (killed) break;
      await sleep(400);
      onEvent({ type: 'activity', text: a });
    }
    const words = s.text.split(/(\s+)/);
    for (let i = 0; i < words.length && !killed; i += 6) {
      onEvent({ type: 'delta', text: words.slice(i, i + 6).join('') });
      await sleep(60);
    }
    if (s.write && !killed) {
      const body = `File thử của AI Team.\nMục đích: kiểm tra pipeline ở chế độ mock.\nTạo lúc: ${new Date().toISOString()}` + (meta.round > 1 ? '\n' : '');
      fs.writeFileSync(path.join(cwd, 'ai-team-mock.txt'), body);
    }
    if (killed) return { ok: false, text: '', error: 'Đã dừng' };
    return { ok: true, text: s.text, error: null };
  })();
  return {
    promise,
    kill() {
      killed = true;
    },
  };
}
