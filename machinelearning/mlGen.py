import sys
import simpleLSTM


def startVPGT(argv):
    print(argv)
    simpleLSTM.genPath(argv, usePretrained=True)

    #just to demo that filepath passed from python can be plotted
    #print('./machineLearning/training/path0.json')
