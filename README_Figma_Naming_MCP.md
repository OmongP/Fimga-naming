# Figma Naming MCP

Figma 디자인 파일의 네이밍 규칙을 검사하고 정리하기 위한 MCP입니다.

디자이너가 반복적으로 확인하던 Frame, Component, Property, Variant
네이밍을 Claude Code에서 검사하고 변경 후보를 확인한 뒤 적용할 수 있도록
만들었습니다.

------------------------------------------------------------------------

## Naming Rules

  대상            규칙            예시
  --------------- --------------- --------------------------------
  Frame           PascalCase      `bottom_sheet` → `BottomSheet`
  Component       PascalCase      `sheet_top` → `SheetTop`
  Property        camelCase       `Show icon` → `showIcon`
  Variant Value   소문자 시작     `Selected` → `selected`
  Boolean Value   변경하지 않음   `True / False` 유지

복합어의 경우 단순히 첫 글자만 대문자로 변경하지 않고 의미 단위로
분리합니다.

예: `bottomsheet` → `BottomSheet`

------------------------------------------------------------------------

## 주요 기능

### 1. checkNaming

현재 네이밍이 규칙에 맞는지 검사합니다.

``` text
Component
sheet_top → SheetTop

Property
Show icon → showIcon
Type → type

Variant value
Selected → selected
```

### 2. previewRename

실제로 변경하기 전에 변경 예정 내용을 확인합니다.

``` text
3 naming issues found

sheet_top → SheetTop
Show icon → showIcon
Selected → selected
```

이 단계에서는 Figma의 이름을 변경하지 않습니다.

### 3. applyRename

확인한 변경사항을 실제로 적용합니다.

권장 사용 흐름:

``` text
checkNaming
↓
previewRename
↓
사용자 확인
↓
applyRename
```

실수로 디자인 파일의 이름이 변경되지 않도록 검사 → 미리보기 → 적용
순서로 구성했습니다.

------------------------------------------------------------------------

# Installation

## 1. Repository Clone

Terminal을 열고 아래 명령어를 실행합니다.

``` bash
git clone https://github.com/OmongP/Fimga-naming.git
```

프로젝트 폴더로 이동합니다.

``` bash
cd Fimga-naming
```

## 2. Package 설치

``` bash
npm install
```

설치가 완료되면 MCP 실행에 필요한 패키지가 준비됩니다.

## 3. Claude Code에 MCP 등록

프로젝트 경로를 확인합니다.

``` bash
pwd
```

예:

``` text
/Users/username/Documents/Fimga-naming
```

Claude Code에 MCP를 등록합니다.

``` bash
claude mcp add figma-naming -- node /Users/username/Documents/Fimga-naming/index.js
```

> `/Users/username/...` 부분은 자신의 실제 프로젝트 경로로 변경해주세요.

## 4. MCP 연결 확인

Claude Code를 실행합니다.

``` bash
claude
```

Claude Code에서:

``` text
/mcp
```

를 입력합니다.

아래와 같이 표시되면 연결 완료입니다.

``` text
figma-naming
connected
```

------------------------------------------------------------------------

# Usage

Claude Code에서 Figma 디자인을 불러온 뒤 아래와 같이 요청할 수 있습니다.

### 네이밍 검사

``` text
이 Figma 컴포넌트의 네이밍 규칙을 검사해줘.
figma-naming MCP의 checkNaming을 사용해줘.
```

### 변경 예정 확인

``` text
네이밍 변경 예정 결과를 보여줘.
아직 실제 이름은 수정하지 마.
```

### 실제 적용

``` text
확인했어.
위 네이밍 변경사항을 적용해줘.
```

------------------------------------------------------------------------

# Example

### Before

``` text
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

``` text
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

------------------------------------------------------------------------

# Why I Made This

Figma MCP를 활용해 디자인을 코드로 구현하는 과정에서 AI와 개발자가
디자인 구조를 이해하기 위해서는 디자인 자체뿐 아니라 일관된 네이밍도
중요하다는 점을 확인했습니다.

하지만 실제 업무에서는 작업 과정에서 네이밍 규칙이 깨지거나, 작업자마다
다른 방식으로 이름을 작성하는 경우가 있습니다.

이 MCP는 사람이 반복적으로 확인하던 네이밍 작업을 자동으로 검사하고,
동일한 규칙으로 정리하기 위해 만들었습니다.

특히 디자인 시스템을 사용하는 팀에서 디자이너 · 개발자 · AI가 동일한
구조를 이해하는 데 도움이 되는 것을 목표로 합니다.

------------------------------------------------------------------------

# Recommended Workflow

``` text
Figma Design
      ↓
Figma MCP
      ↓
Claude Code
      ↓
Figma Naming MCP
      ↓
Naming Check
      ↓
Preview
      ↓
Apply
```

------------------------------------------------------------------------

# Development

현재 적용된 주요 규칙:

``` text
Component / Frame
→ PascalCase

Property
→ camelCase

Variant string value
→ lowercase first letter

Boolean value
→ unchanged
```

Test:

``` bash
npm test
```

현재 네이밍 규칙 관련 테스트를 통해 동작을 확인하고 있습니다.

------------------------------------------------------------------------

# Future

-   팀별 Naming Dictionary
-   디자인시스템 컴포넌트 규칙 검사
-   잘못된 Variant 구조 탐지
-   Figma Layer Naming 검사
-   사내 디자인시스템 전용 MCP
-   npm 또는 Remote MCP 형태의 팀 배포

------------------------------------------------------------------------

## License

See `LICENSE`.
