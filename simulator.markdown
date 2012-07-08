---
layout: basic
---

<h2>Simulator</h2>

To use the disassembler, click **Compile**, then **Disassemble**. [Back to Easy 6502](index.html).

{% include start.html %}
; Spacer
;
; From 6502asm.com
;
; Controls:
;
;   W - move up
;   X - move down
;   Any other key will stop the ship

start:
  jsr init

loop:
  jsr drawShip
  jsr drawMap
  jsr genMap
  jsr readKeys
  jmp loop

;--

drawShip:
  lda $60
  asl
  tay

  lda ypos,y
  sta $00
  iny
  lda ypos,y
  sta $01

  ldy #42
  lda ($00),y
  cmp #0
  beq noCrash
  cmp #5
  bne crashed
noCrash:
  lda #5
  sta ($00),y

  lda $60
  cmp $61
  beq ret

  lda $61
  asl
  tay
  lda ypos,y
  sta $00
  iny
  lda ypos,y
  sta $01
  lda #0
  ldy #42
  sta ($00),y

  lda $60
  sta $61
ret:
  rts

;--

crashed:
  lda $fe
  sta ($00),y
  jmp crashed

;--

readKeys:
  lda $ff
  cmp #119
  bne notUp
  dec $60
  rts
notUp:
  cmp #120
  bne noMove
  inc $60
noMove:
  rts

;--

init:
  ldx #0
drawLogo:
  lda bottomLogo,x
  sta $500,x
  inx
  cpx #0
  bne drawLogo

  lda #10
  sta $60
  sta $61

  ldx #0
  lda #$c
c:sta $200,x
  sta $400,x
  dex
  cpx #0
  bne c

  lda #16
  sta $80  ; origin
  ldx #15
set:
  sta $81,x  ; target
  dex
  bpl set
  rts

;--

drawMap:
  lda #0
  sta $78
  lda #32
  sta $79
  lda #192
  sta $7a
  lda #224
  sta $7b

  ldx #15
drawLoop:
  lda $81,x
  sta $82,x
  tay
  lda ypos,y
  sta $00
  iny
  lda ypos,y
  sta $01

  lda #$c
  ldy $78
  sta ($00),y
  iny
  sta ($00),y

  ldy $7b
  sta ($00),y
  iny
  sta ($00),y

  ldy $79
  lda #0
  sta ($00),y
  iny
  sta ($00),y

  ldy $7a
  sta ($00),y
  iny
  sta ($00),y

  inc $78
  inc $79
  inc $7a
  inc $7b
  inc $78
  inc $79
  inc $7a
  inc $7b
  dex
  bpl drawLoop
  rts

;---

genMap:
  lda $80
  cmp $81
  beq done
  lda $80
  clc
  sbc $81
  bpl plus
  bmi minus
done:
  lda $fe
  and #$f
  asl
  sta $80
  rts
minus:
  dec $81
  dec $81
  rts
plus:
  inc $81
  inc $81
  rts

ypos:
  dcb $00,$02,$20,$02,$40,$02,$60,$02
  dcb $80,$02,$a0,$02,$c0,$02,$e0,$02
  dcb $00,$03,$20,$03,$40,$03,$60,$03
  dcb $80,$03,$a0,$03,$c0,$03,$e0,$03
  dcb $00,$04,$20,$04,$40,$04,$60,$04
  dcb $80,$04,$a0,$04,$c0,$04,$e0,$04
  dcb $00,$05,$20,$05,$40,$05,$60,$05
  dcb $80,$05,$a0,$05,$c0,$05,$e0,$05

bottomLogo:
  dcb $0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0
  dcb $0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0,$0
  dcb $0,$0,$0,$0,$0,$0,$1,$1,$1,$6,$1,$1,$1,$0
  dcb $0,$6,$1,$1,$6,$0,$0,$1,$1,$1,$6,$0,$1,$1
  dcb $1,$0,$1,$1,$1,$6,$0,$0,$6,$1,$6,$0,$6,$0
  dcb $1,$0,$6,$1,$6,$1,$6,$0,$1,$0,$1,$0,$6,$0
  dcb $6,$1,$6,$0,$6,$0,$1,$0,$6,$1,$6,$0,$0,$6
  dcb $1,$1,$6,$6,$1,$1,$1,$0,$6,$1,$0,$0,$1,$0
  dcb $1,$6,$0,$6,$6,$1,$1,$1,$0,$6,$1,$0,$6,$1
  dcb $0,$6,$6,$6,$6,$6,$1,$6,$1,$1,$6,$6,$6,$1
  dcb $1,$1,$1,$6,$1,$6,$6,$6,$6,$1,$6,$6,$6,$6
  dcb $1,$1,$1,$6,$6,$6,$6,$1,$1,$1,$1,$e,$1,$1
  dcb $e,$6,$6,$1,$1,$6,$1,$6,$1,$1,$1,$1,$e,$1
  dcb $1,$1,$1,$6,$1,$1,$6,$1,$6,$6,$6,$1,$1,$1
  dcb $6,$e,$1,$1,$6,$e,$6,$1,$1,$e,$1,$e,$6,$1
  dcb $1,$1,$6,$e,$1,$1,$1,$e,$1,$1,$6,$1,$6,$e
  dcb $e,$e,$6,$e,$e,$6,$e,$e,$6,$e,$e,$6,$e,$e
  dcb $6,$e,$e,$6,$e,$e,$6,$e,$e,$6,$e,$e,$6,$e
  dcb $e,$6,$e,$e
{% include end.html %}
