; ============================================================
; NSIS 설치 프로그램 추가 설정
;
; 【이 파일이 필요한 이유】
;  HYUNLAB Memo는 관리자 권한 없이 설치되는 '사용자 설치' 방식입니다.
;  (설치할 때 UAC 창이 뜨지 않아 편하고, 회사 PC에서도 설치됩니다)
;
;  그런데 설치 폴더를 직접 고를 수 있게 해 두면
;  사용자가 C:\Program Files 처럼 관리자 권한이 필요한 폴더를 고를 수 있고,
;  그러면 파일을 쓰지 못해 '빈 폴더만 생기고 설치가 실패'합니다.
;
;  아래 코드는 그런 폴더를 고르면 [다음] 버튼을 막아서
;  설치가 중간에 깨지는 것을 미리 방지합니다.
; ============================================================

!macro customHeader
  ; 설치 폴더를 고를 때마다 NSIS가 자동으로 호출하는 함수입니다.
  ; Abort 를 부르면 [다음] 버튼이 비활성화됩니다.
  Function .onVerifyInstDir
    ; 폴더가 비어 있으면 진행 불가
    ${If} $INSTDIR == ""
      Abort
    ${EndIf}

    ; 앞부분이 보호된 시스템 폴더와 일치하면 막습니다.
    Push $PROGRAMFILES64
    Call CheckForbiddenDir
    Push $PROGRAMFILES32
    Call CheckForbiddenDir
    Push $WINDIR
    Call CheckForbiddenDir
  FunctionEnd

  ; 스택에서 받은 폴더로 $INSTDIR가 시작하는지 검사하고,
  ; 시작하면 Abort(=다음 버튼 잠금)합니다.
  Function CheckForbiddenDir
    Exch $R0            ; $R0 = 검사할 보호 폴더
    Push $R1
    Push $R2

    StrLen $R1 $R0
    StrCpy $R2 $INSTDIR $R1

    ${If} $R2 == $R0
      Pop $R2
      Pop $R1
      Pop $R0
      Abort
    ${EndIf}

    Pop $R2
    Pop $R1
    Pop $R0
  FunctionEnd
!macroend
