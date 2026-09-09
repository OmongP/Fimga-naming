# Figma Naming MCP

Figma 디자인 파일의 네이밍 규칙을 검사하고 정리하기 위한 MCP입니다.

디자이너가 반복적으로 확인하던 **Frame · Component · Property · Variant** 네이밍을
Claude Code에서 검사하고, 변경 후보를 확인한 뒤 적용할 수 있도록 만들었습니다.
`checkNaming → previewRename → applyRename` 3단계로 안전하게 이름을 정리합니다.

## 실행 화면

![figma-naming-mcp 실행 캡처](docs/demo.svg)

---

## Naming Rules

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| Frame | **PascalCase** | `bottom_sheet` → `BottomSheet` |
| Component | **PascalCase** | `sheet_top` → `SheetTop` |
| Property | **camelCase** | `Show icon` → `showIcon` |
| Variant Value | **소문자 시작** | `Selected` → `selected` |
| Boolean Value | **변경하지 않음** | `True / False` 유지 |

복합어의 경우 단순히 첫 글자만 대문자로 바꾸지 않고 **의미 단위로 분리**합니다.
사전(`DEFAULT_DICTIONARY`: bottom, sheet, contents, full, top, ads, box, button, status, bar, text, field, home, dark, mode, service, system, caption, list)으로 처리하며 규칙 인자로 확장할 수 있습니다.

예: `bottomsheet` → `BottomSheet`, `textfield` → `TextField`, `Darkmode` → `darkMode`

### 예외 처리 (기계적 규칙을 적용하면 안 되는 값)

실무에서 그대로 소문자화하면 오히려 깨지는 값들이 있어, 다음은 **변경하지 않습니다**:

| 값 유형 | 예시 | 이유 |
| --- | --- | --- |
| 코드성 ID (구분자 포함) | `SS_001_receipt` | 자체 ID 컨벤션 — `sS_001_...`로 깨짐 |
| 숫자 시작 | `1depth`, `12` | 소문자화 불가 |
| 비라틴(한글 등) | `주민등록번호` | 대소문자 개념 없음 |
| 이미 소문자 시작 | `basic`, `suffix-unit` | 준수 |

- **Variant 값은 "대문자로 시작하는 단순 라틴 단어"일 때만** 정규화합니다 (`Yes→yes`, `Selected→selected`).
- **속성명의 괄호 주석은 제거**한 뒤 케이싱합니다: `Asterisk (별표)` → `asterisk`.
- `Property 1` 같은 Figma 기본 속성명은 케이싱만 되므로(`property1`), 의미 있는 이름(예: `icon`)은 사람이 지정합니다.

---

## 주요 기능

### 1. checkNaming

현재 네이밍이 규칙에 맞는지 검사합니다.

```text
Component
sheet_top → SheetTop

Property
Show icon → showIcon
Type → type

Variant value
Selected → selected
```

### 2. previewRename

실제로 변경하기 전에 변경 예정 내용(`before → after`)과 실행용 `operations`를 확인합니다.
이 단계에서는 **Figma의 이름을 변경하지 않습니다.**

```text
3 naming issues found

sheet_top → SheetTop
Show icon → showIcon
Selected → selected
```

### 3. applyRename

확인한 변경사항을 실제로 적용합니다. 실수로 이름이 바뀌지 않도록 **검사 → 미리보기 → 사용자 확인 → 적용** 순서로 구성했습니다.

```text
checkNaming
↓
previewRename
↓
사용자 확인
↓
applyRename
```

`operations`는 3종류이며, 클라이언트(Claude)가 공식 Figma MCP의 `use_figma`로 실행합니다.

| operation | 동작 |
| --- | --- |
| `renameNode` | `node.name = to` |
| `renameProperty` | `componentSet.editComponentProperty(from, { name: to })` |
| `renameVariantValue` | variant 자식 컴포넌트의 `name`을 `prop=value`에서 값만 교체 |

> 이 MCP는 Figma를 직접 건드리지 않고 "이름 규칙"만 판단하는 **결정적(deterministic) 규칙 엔진**입니다.
> 실제 Figma 읽기 / 쓰기 / 캡처는 **공식 Figma MCP**가 담당하며, Claude가 두 MCP를 오케스트레이션합니다.

---

# Installation

## 사전 준비물

- **Node.js 18+** (`node --version`)
- **Claude Code** (CLI 또는 데스크톱 앱)
- **공식 Figma MCP** 연결 — 실제 Figma 읽기/쓰기/캡처를 담당하므로 함께 연결돼 있어야 합니다.

## 1. Repository Clone

Terminal을 열고 아래 명령어를 실행합니다.

```bash
git clone https://github.com/OmongP/Fimga-naming.git
```

프로젝트 폴더로 이동합니다.

```bash
cd Fimga-naming
```

## 2. Package 설치

```bash
npm install
```

설치가 완료되면 MCP 실행에 필요한 패키지가 준비됩니다.

## 3. 테스트 (규칙 엔진 검증)

```bash
npm test
```

## 4. Claude Code에 MCP 등록

프로젝트 경로를 확인합니다.

```bash
pwd
```

예:

```text
/Users/username/Documents/Fimga-naming
```

Claude Code에 MCP를 등록합니다. (현재 폴더 기준 절대경로로 등록하면 편리합니다.)

```bash
claude mcp add figma-naming -- node "$(pwd)/index.js"
```

> `/Users/username/...` 부분은 자신의 실제 프로젝트 경로로 변경해주세요.

## 5. MCP 연결 확인

Claude Code를 실행합니다.

```bash
claude
```

Claude Code에서 `/mcp` 를 입력했을 때 아래처럼 표시되면 연결 완료입니다.
공식 Figma MCP도 함께 연결됐는지 확인하세요.

```text
figma-naming
connected
```

---

# Usage

Claude Code에서 정리할 **컴포넌트 / 프레임을 Figma에서 선택**한 뒤 아래와 같이 요청할 수 있습니다.

### 네이밍 검사

```text
이 Figma 컴포넌트의 네이밍 규칙을 검사해줘.
figma-naming MCP의 checkNaming을 사용해줘.
```

### 변경 예정 확인

```text
네이밍 변경 예정 결과를 보여줘.
아직 실제 이름은 수정하지 마.
```

### 실제 적용

```text
확인했어.
위 네이밍 변경사항을 적용해줘.
```

이름 변경이라 Figma에서 `Cmd+Z`로 되돌릴 수 있습니다.

---

# Example

### Before

```text
Frame
bottom_sheet

Component
sheet_top

Property
Show icon
Sub Text

Variant
Selected
```

### After

```text
Frame
BottomSheet

Component
SheetTop

Property
showIcon
subText

Variant
selected
```

Boolean 값인 `True`, `False`는 변경하지 않습니다.

---

# Why I Made This

Figma MCP를 활용해 디자인을 코드로 구현하는 과정에서, AI와 개발자가 디자인 구조를 이해하려면
디자인 자체뿐 아니라 **일관된 네이밍**도 중요하다는 점을 확인했습니다.

하지만 실제 업무에서는 작업 과정에서 네이밍 규칙이 깨지거나, 작업자마다 다른 방식으로 이름을 작성하는 경우가 있습니다.

이 MCP는 사람이 반복적으로 확인하던 네이밍 작업을 자동으로 검사하고, 동일한 규칙으로 정리하기 위해 만들었습니다.
특히 디자인 시스템을 사용하는 팀에서 **디자이너 · 개발자 · AI가 동일한 구조를 이해**하는 데 도움이 되는 것을 목표로 합니다.

---

# Recommended Workflow

```text
Figma Design
      ↓
Figma MCP        (선택 노드 읽기)
      ↓
Claude Code      (오케스트레이터)
      ↓
Figma Naming MCP (규칙 검사·제안)
      ↓
Naming Check → Preview → Apply
```

---

# Development

현재 적용된 주요 규칙:

```text
Component / Frame     → PascalCase (복합어 분리)
Property              → camelCase
Variant string value  → lowercase first letter
Boolean value         → unchanged
```

프로젝트 구조:

```text
index.js              MCP 서버 (stdio, 도구 4개)
src/conventions.js    케이스 변환·검증, 복합어 분리, 기본 이름 감지
src/naming.js         검사·리네임 계획·결과 화면 포맷
test/naming.test.js   규칙 엔진 테스트 (11개)
examples/demo.mjs     checkNaming→previewRename→applyRename 실행 데모
docs/demo.svg         실행 화면 캡처
```

Test:

```bash
npm test
```

End-to-end 데모 실행:

```bash
node examples/demo.mjs
```

---

# Future

- 팀별 Naming Dictionary
- 디자인시스템 컴포넌트 규칙 검사
- 잘못된 Variant 구조 탐지
- Figma Layer Naming 검사
- 사내 디자인시스템 전용 MCP
- npm 또는 Remote MCP 형태의 팀 배포

---

## License

See [`LICENSE`](LICENSE). (ISC)
